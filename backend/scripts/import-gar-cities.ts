import 'dotenv/config';
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createInflateRaw } from 'node:zlib';
import * as sax from 'sax';
import unzipper from 'unzipper';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import {
  reconcileGarCities,
  type GarCitySnapshotRow,
} from './import-gar-cities-reconcile';

type CityRow = {
  garObjectId: bigint;
  objectGuid: string;
  name: string;
  typeName: string;
  level: number;
  regionCode: string;
  regionName: string;
};

function parseArgs(argv: string[]) {
  const out: { zip?: string; dir?: string; cleanup?: boolean; outDir?: string; mode?: 'auto' | 'full' | 'delta' } = {};
  for (let i = 0; i < argv.length; i++) {
    const cur = argv[i];
    if (cur === '--zip') out.zip = argv[i + 1];
    if (cur === '--dir') out.dir = argv[i + 1];
    if (cur === '--out') out.outDir = argv[i + 1];
    if (cur === '--mode') {
      const m = argv[i + 1];
      if (m === 'auto' || m === 'full' || m === 'delta') {
        out.mode = m;
      }
    }
    if (cur === '--cleanup') out.cleanup = argv[i + 1] !== '0' && argv[i + 1] !== 'false';
  }
  return out;
}

const DEFAULT_FULL_OUT_DIR = '/Volumes/One Touch/Projects/novagor/cities';
const DEFAULT_TMP_DIR = '/Volumes/One Touch/Projects/novagor/cities/tmp';

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return `${bytes}`;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
  let v = bytes;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  return `${v.toFixed(u === 0 ? 0 : 1)} ${units[u]}`;
}

function formatDateFolder(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

function buildFiasFileUrl(dateFolder: string, archiveName: string) {
  return `https://fias-file.nalog.ru/downloads/${dateFolder}/${archiveName}`;
}

async function headOk(url: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'new-gorisons/gar-downloader' },
    });
    return { ok: res.ok, status: res.status, headers: res.headers };
  } finally {
    clearTimeout(t);
  }
}

async function findLatestAvailableDate(archiveName: string, maxDaysBack: number) {
  const now = new Date();
  for (let back = 0; back <= maxDaysBack; back++) {
    const candidate = new Date(now.getTime());
    candidate.setDate(candidate.getDate() - back);
    const folder = formatDateFolder(candidate);
    const url = buildFiasFileUrl(folder, archiveName);
    const head = await headOk(url);
    if (head.ok) {
      return { folder, url, headers: head.headers };
    }
  }
  throw new Error(`Could not find ${archiveName} in the last ${maxDaysBack} day(s)`);
}

type DownloadMeta = {
  url: string;
  folder: string;
  etag: string | null;
  lastModified: string | null;
  contentLength: number | null;
  createdAt: string;
};

async function readDownloadMeta(metaPath: string): Promise<DownloadMeta | null> {
  try {
    const raw = await readFile(metaPath, 'utf8');
    return JSON.parse(raw) as DownloadMeta;
  } catch {
    return null;
  }
}

async function writeDownloadMeta(metaPath: string, meta: Omit<DownloadMeta, 'createdAt'>) {
  const full: DownloadMeta = { ...meta, createdAt: new Date().toISOString() };
  await writeFile(metaPath, JSON.stringify(full, null, 2) + '\n', 'utf8');
}

async function verifyZipCanStreamOneEntry(zipPath: string) {
  // Fast-ish sanity check: list entries and try to stream one regional AS_ADDR_OBJ XML.
  // This catches corrupted/truncated downloads early (e.g. wrong resume target).
  const dir = await unzipper.Open.file(zipPath);
  const files = dir.files.filter((f) => f.type === 'File');
  const entry = files.find((f) => /^\d{2}\/AS_ADDR_OBJ_.*\.XML$/i.test(f.path));
  if (!entry) {
    throw new Error('GAR XML files not found in ZIP (expected regional AS_ADDR_OBJ_*.XML)');
  }
  const stream = entry.stream();
  await new Promise<void>((resolve, reject) => {
    let done = false;
    stream.once('error', (e) => reject(e));
    stream.once('end', () => resolve());
    stream.once('data', () => {
      if (done) return;
      done = true;
      stream.destroy();
      resolve();
    });
  });
}

async function renameArchiveWithMeta(outPath: string, metaPath: string, suffix: string) {
  const bak = `${outPath}.${suffix}.${Date.now()}`;
  console.log(`Renaming to: ${bak}`);
  await rename(outPath, bak);
  try {
    await rename(metaPath, `${bak}.meta.json`);
  } catch {
    // ignore
  }
}

async function downloadGarArchive(
  outDir: string,
  archiveName: 'gar_xml.zip' | 'gar_delta_xml.zip',
) {
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, archiveName);
  const metaPath = `${outPath}.meta.json`;

  const { folder, url, headers } = await findLatestAvailableDate(archiveName, 30);
  const total = Number(headers.get('content-length') ?? '0') || null;
  const etag = headers.get('etag');
  const lastModified = headers.get('last-modified');

  console.log(`Downloading GAR (XML): ${archiveName}`);
  console.log(`Date: ${folder}`);
  console.log(`Source: ${url}`);
  console.log(`Output: ${outPath}`);

  // Persist metadata up-front so retries can resume instead of creating "mismatch" files.
  // (We also update it again after a successful download.)
  await writeDownloadMeta(metaPath, {
    url,
    folder,
    etag: etag ?? null,
    lastModified: lastModified ?? null,
    contentLength: total,
  });

  const maxRetries = 20;
  let attempt = 0;
  // Retry loop: keep resuming until completed (or retries exceeded).
  while (true) {
    // Resume support (useful for huge gar_xml.zip)
    let existingBytes = 0;
    try {
      const st = await stat(outPath);
      if (st.isFile()) existingBytes = st.size;
    } catch {
      // ignore
    }

    // Guard against resuming a file that belongs to a different date/URL.
    // If meta is missing or doesn't match, we rename the file aside and start fresh.
    if (existingBytes > 0) {
      const prevMeta = await readDownloadMeta(metaPath);
      const metaMatches =
        prevMeta &&
        prevMeta.url === url &&
        prevMeta.folder === folder &&
        (prevMeta.contentLength ?? null) === total &&
        (prevMeta.etag ?? null) === (etag ?? null) &&
        (prevMeta.lastModified ?? null) === (lastModified ?? null);

      if (!metaMatches) {
        console.log(`Existing archive does not match current source metadata.`);
        await renameArchiveWithMeta(outPath, metaPath, 'mismatch');
        existingBytes = 0;
      }
    }

    if (existingBytes > 0 && total && existingBytes >= total) {
      console.log(`Already downloaded: ${formatBytes(existingBytes)} (expected ${formatBytes(total)})`);
      try {
        await verifyZipCanStreamOneEntry(outPath);
        return outPath;
      } catch (e: any) {
        console.log(`Archive verification failed (${String(e?.message ?? e)}).`);
        await renameArchiveWithMeta(outPath, metaPath, 'corrupt');
        existingBytes = 0;
      }
    }

    const requestHeaders: Record<string, string> = {
      'user-agent': 'new-gorisons/gar-downloader',
    };

    if (existingBytes > 0) {
      requestHeaders.range = `bytes=${existingBytes}-`;
      if (total) {
        console.log(`Resuming: already have ${formatBytes(existingBytes)} / ${formatBytes(total)}`);
      } else {
        console.log(`Resuming: already have ${formatBytes(existingBytes)}`);
      }
    }

    attempt++;
    try {
      const response = await fetch(url, { redirect: 'follow', headers: requestHeaders });

      // 416 can happen if server thinks range is beyond file end.
      if (response.status === 416) {
        if (total) {
          console.log(`Server returned 416; assuming already complete (${formatBytes(existingBytes)} / ${formatBytes(total)})`);
          return outPath;
        }
        throw new Error(`Download failed: HTTP 416 (range not satisfiable)`);
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Download failed: HTTP ${response.status}. ${text.slice(0, 200)}`);
      }

      // If we requested a range, the server must respond with 206.
      // A 200 here means the server ignored Range and we'd corrupt the file by appending.
      if (existingBytes > 0 && response.status !== 206) {
        console.log(`Server ignored Range (HTTP ${response.status}).`);
        await renameArchiveWithMeta(outPath, metaPath, 'range-ignored');
        existingBytes = 0;
        continue;
      }

      const body = response.body;
      if (!body) {
        throw new Error('Response body is empty');
      }

      let downloaded = existingBytes;
      // TS can confuse DOM ReadableStream types with node:stream/web ones in mixed setups.
      // Runtime is fine in Node 20+, so we cast to `any` for compatibility.
      const nodeStream = Readable.fromWeb(body as any);
      nodeStream.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
        if (total) {
          const pct = Math.round((downloaded / total) * 100);
          process.stdout.write(`\r${pct}% (${formatBytes(downloaded)} / ${formatBytes(total)})`);
        } else {
          process.stdout.write(`\r${formatBytes(downloaded)}`);
        }
      });

      await pipeline(nodeStream, createWriteStream(outPath, { flags: existingBytes > 0 ? 'a' : 'w' }));
      process.stdout.write('\n');
      console.log('Download done.');

      await writeDownloadMeta(metaPath, {
        url,
        folder,
        etag: etag ?? null,
        lastModified: lastModified ?? null,
        contentLength: total,
      });

      // Optional but helpful: verify the resulting ZIP is readable before continuing.
      try {
        await verifyZipCanStreamOneEntry(outPath);
      } catch (e: any) {
        console.log(`Archive verification failed (${String(e?.message ?? e)}).`);
        await renameArchiveWithMeta(outPath, metaPath, 'corrupt');
        continue;
      }
      break;
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      const code = String(e?.cause?.code ?? e?.code ?? '');
      const retryable =
        msg.toLowerCase().includes('terminated') ||
        code === 'ECONNRESET' ||
        code === 'ETIMEDOUT' ||
        code === 'EPIPE' ||
        code === 'UND_ERR_CONNECT_TIMEOUT';

      if (!retryable) throw e;

      if (attempt > maxRetries) {
        throw new Error(`Download aborted after ${maxRetries} retry attempt(s): ${msg}`);
      }

      const delayMs = Math.min(30_000, 1_000 * Math.pow(2, Math.min(5, attempt - 1)));
      console.log(`\nDownload interrupted (${code || 'network'}). Retrying in ${Math.round(delayMs / 1000)}s... (attempt ${attempt}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }
  }

  return outPath;
}

type RemoteZipEntry = {
  path: string;
  compression: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

function readU16LE(buf: Buffer, off: number) {
  return buf.readUInt16LE(off);
}

function readU32LE(buf: Buffer, off: number) {
  return buf.readUInt32LE(off);
}

async function fetchRangeBuffer(url: string, start: number, endInclusive: number) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'new-gorisons/gar-downloader',
      range: `bytes=${start}-${endInclusive}`,
    },
  });

  if (!(res.ok || res.status === 206)) {
    throw new Error(`Range fetch failed: HTTP ${res.status}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

function findEocdOffset(tail: Buffer) {
  // End of central directory signature: 0x06054b50
  const sig = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  // Search backwards; comment length is variable.
  for (let i = tail.length - 22; i >= 0; i--) {
    if (tail[i] === sig[0] && tail.slice(i, i + 4).equals(sig)) return i;
  }
  return -1;
}

function findZip64LocatorOffset(tail: Buffer, eocdOffset: number) {
  // ZIP64 EOCD locator signature: 0x07064b50 (50 4b 06 07)
  const sig = Buffer.from([0x50, 0x4b, 0x06, 0x07]);
  for (let i = Math.min(eocdOffset - 20, tail.length - 20); i >= 0; i--) {
    if (tail[i] === sig[0] && tail.slice(i, i + 4).equals(sig)) return i;
  }
  return -1;
}

function readU64LE(buf: Buffer, off: number) {
  const v = buf.readBigUInt64LE(off);
  const n = Number(v);
  if (!Number.isSafeInteger(n)) {
    throw new Error(`ZIP64 value exceeds JS safe integer: ${v.toString()}`);
  }
  return n;
}

function parseZip64Extra(extra: Buffer) {
  // Extra field format: [headerId u16][dataSize u16][data...]
  let p = 0;
  while (p + 4 <= extra.length) {
    const headerId = extra.readUInt16LE(p);
    const dataSize = extra.readUInt16LE(p + 2);
    const dataStart = p + 4;
    const dataEnd = dataStart + dataSize;
    if (dataEnd > extra.length) break;
    if (headerId === 0x0001) {
      return extra.subarray(dataStart, dataEnd);
    }
    p = dataEnd;
  }
  return null;
}

async function listRemoteZipEntries(zipUrl: string) {
  const head = await headOk(zipUrl, 15000);
  if (!head.ok) throw new Error(`HEAD failed: HTTP ${head.status}`);
  const totalSize = Number(head.headers.get('content-length') ?? '0');
  if (!Number.isFinite(totalSize) || totalSize <= 0) {
    throw new Error('Could not determine remote zip size (missing content-length)');
  }

  // Fetch tail to locate EOCD.
  const tailSize = Math.min(1024 * 256, totalSize);
  const tailStart = totalSize - tailSize;
  const tail = await fetchRangeBuffer(zipUrl, tailStart, totalSize - 1);

  const eocdInTail = findEocdOffset(tail);
  if (eocdInTail < 0) throw new Error('EOCD not found in remote ZIP tail');
  const eocd = tail.subarray(eocdInTail);
  let centralDirSize = readU32LE(eocd, 12);
  let centralDirOffset = readU32LE(eocd, 16);

  // ZIP64 support (needed for gar_xml.zip > 4GB)
  if (centralDirSize === 0xffffffff || centralDirOffset === 0xffffffff) {
    const locInTail = findZip64LocatorOffset(tail, eocdInTail);
    if (locInTail < 0) throw new Error('ZIP64 locator not found');
    const locator = tail.subarray(locInTail, locInTail + 20);
    const zip64EocdOffset = readU64LE(locator, 8);

    // ZIP64 EOCD record starts at zip64EocdOffset; read enough for fixed fields.
    const zip64Eocd = await fetchRangeBuffer(zipUrl, zip64EocdOffset, zip64EocdOffset + 56 - 1);
    const ZIP64_EOCD_SIG = 0x06064b50;
    if (readU32LE(zip64Eocd, 0) !== ZIP64_EOCD_SIG) throw new Error('Bad ZIP64 EOCD signature');
    // central dir size and offset are 8-byte fields near end of fixed part
    centralDirSize = readU64LE(zip64Eocd, 40);
    centralDirOffset = readU64LE(zip64Eocd, 48);
  }

  const central = await fetchRangeBuffer(
    zipUrl,
    centralDirOffset,
    centralDirOffset + centralDirSize - 1,
  );

  const entries: RemoteZipEntry[] = [];
  let p = 0;
  const CEN_SIG = 0x02014b50;
  while (p + 46 <= central.length) {
    const sig = readU32LE(central, p);
    if (sig !== CEN_SIG) break;
    const compression = readU16LE(central, p + 10);
    let compressedSize = readU32LE(central, p + 20);
    let uncompressedSize = readU32LE(central, p + 24);
    const nameLen = readU16LE(central, p + 28);
    const extraLen = readU16LE(central, p + 30);
    const commentLen = readU16LE(central, p + 32);
    let localHeaderOffset = readU32LE(central, p + 42);
    const nameStart = p + 46;
    const nameEnd = nameStart + nameLen;
    const path = central.subarray(nameStart, nameEnd).toString('utf8');

    if (
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      localHeaderOffset === 0xffffffff
    ) {
      const extra = central.subarray(nameEnd, nameEnd + extraLen);
      const zip64 = parseZip64Extra(extra);
      if (zip64) {
        let q = 0;
        if (uncompressedSize === 0xffffffff) {
          uncompressedSize = readU64LE(zip64, q);
          q += 8;
        }
        if (compressedSize === 0xffffffff) {
          compressedSize = readU64LE(zip64, q);
          q += 8;
        }
        if (localHeaderOffset === 0xffffffff) {
          localHeaderOffset = readU64LE(zip64, q);
          q += 8;
        }
      }
    }

    entries.push({
      path,
      compression,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });

    p = nameEnd + extraLen + commentLen;
  }

  return { entries, totalSize };
}

async function openRemoteZipEntryXmlStream(zipUrl: string, entry: RemoteZipEntry) {
  // Read local file header to find start of data
  const localHeader = await fetchRangeBuffer(zipUrl, entry.localHeaderOffset, entry.localHeaderOffset + 30 - 1);
  const LOC_SIG = 0x04034b50;
  const sig = readU32LE(localHeader, 0);
  if (sig !== LOC_SIG) throw new Error(`Bad local header signature for ${entry.path}`);
  const nameLen = readU16LE(localHeader, 26);
  const extraLen = readU16LE(localHeader, 28);
  const dataStart = entry.localHeaderOffset + 30 + nameLen + extraLen;
  const dataEnd = dataStart + entry.compressedSize - 1;

  const res = await fetch(zipUrl, {
    redirect: 'follow',
    headers: {
      'user-agent': 'new-gorisons/gar-downloader',
      range: `bytes=${dataStart}-${dataEnd}`,
    },
  });
  if (!(res.ok || res.status === 206)) {
    throw new Error(`Failed to fetch entry data (${entry.path}): HTTP ${res.status}`);
  }
  if (!res.body) throw new Error(`Empty body for entry: ${entry.path}`);

  const nodeStream = Readable.fromWeb(res.body as any);
  if (entry.compression === 0) return nodeStream;
  if (entry.compression === 8) return nodeStream.pipe(createInflateRaw());
  throw new Error(`Unsupported ZIP compression method ${entry.compression} for ${entry.path}`);
}

function isRegionAddrObjXmlPath(p: string) {
  const u = p.toUpperCase();
  if (!u.endsWith('.XML')) return false;
  if (!u.includes('AS_ADDR_OBJ_')) return false;
  // Skip dictionaries like AS_ADDR_OBJ_TYPES_... in root
  return /^\d{2}\//.test(p);
}

function isRegionAdmHierarchyXmlPath(p: string) {
  const u = p.toUpperCase();
  if (!u.endsWith('.XML')) return false;
  if (!u.includes('AS_ADM_HIERARCHY_')) return false;
  return /^\d{2}\//.test(p);
}

async function parseFromLocalGarXmlZip(zipPath: string) {
  console.log(`Reading GAR XML ZIP without extracting: ${zipPath}`);
  const dir = await unzipper.Open.file(zipPath);
  const files = dir.files.filter((f) => f.type === 'File');
  const addrEntries = files.filter((f) => isRegionAddrObjXmlPath(f.path));
  const admEntries = files.filter((f) => isRegionAdmHierarchyXmlPath(f.path));

  console.log(`Found in ZIP:`);
  console.log(`- AS_ADDR_OBJ: ${addrEntries.length} file(s)`);
  console.log(`- AS_ADM_HIERARCHY: ${admEntries.length} file(s)`);

  if (addrEntries.length === 0 || admEntries.length === 0) {
    throw new Error(
      'GAR XML files not found in ZIP (expected regional AS_ADDR_OBJ_*.XML and AS_ADM_HIERARCHY_*.XML). ' +
        'If you downloaded from its.1c.ru, it may contain *.FI files (not supported). ' +
        'Use official dumps from fias-file.nalog.ru (gar_xml.zip / gar_delta_xml.zip).',
    );
  }

  const cityByObjectId = new Map<bigint, Omit<CityRow, 'regionCode' | 'regionName'>>();
  const cityObjectIds = new Set<bigint>();
  const regionByObjectId = new Map<bigint, { name: string; typeName: string }>();
  const regionObjectIds = new Set<bigint>();
  const cityRegionCode = new Map<bigint, string>();
  const regionNameByCode = new Map<string, string>();

  let idx = 0;
  for (const e of addrEntries) {
    idx++;
    if (idx === 1 || idx % 10 === 0) console.log(`ADDR_OBJ (zip): ${idx}/${addrEntries.length}`);
    const regionCodeFromPath = /^\d{2}\//.test(e.path) ? e.path.slice(0, 2) : null;
    const stream = e.stream();
    await parseXmlStream(stream, (node) => {
      const attrs = upperAttrs(node.attributes as unknown as Record<string, unknown>);
      const objectIdRaw = attrs.OBJECTID;
      const objectGuid = attrs.OBJECTGUID;
      const name = attrs.NAME;
      const typeName = attrs.TYPENAME;
      const levelRaw = attrs.LEVEL;
      const isActual = attrs.ISACTUAL;
      const isActive = attrs.ISACTIVE;

      if (!objectIdRaw || !objectGuid || !name || !typeName || !levelRaw) return;
      if (isActual !== '1' || isActive !== '1') return;

      let objectId: bigint;
      try {
        objectId = BigInt(objectIdRaw);
      } catch {
        return;
      }

      const level = Number(levelRaw);
      if (!Number.isFinite(level)) return;

      if (isSupportedAddrObject(level, typeName)) {
        const normalizedName = normalizeCityName(name, typeName);
        cityByObjectId.set(objectId, {
          garObjectId: objectId,
          objectGuid,
          name: normalizedName,
          typeName,
          level,
        });
        cityObjectIds.add(objectId);
        if (regionCodeFromPath) {
          cityRegionCode.set(objectId, regionCodeFromPath);
          if (level === 1) {
            // Federal cities are subjects; use this record as regionName source too.
            regionNameByCode.set(regionCodeFromPath, formatRegionName(normalizedName, typeName));
          }
        }
        return;
      }

      if (level === 1) {
        regionByObjectId.set(objectId, { name, typeName });
        regionObjectIds.add(objectId);
        if (regionCodeFromPath) {
          regionNameByCode.set(regionCodeFromPath, formatRegionName(name, typeName));
        }
      }
    });
  }

  // If we can derive regionCode from ZIP path (01/.., 77/..), ADM_HIERARCHY is unnecessary.
  // Keep it as a fallback for sources without regional folder prefixes.
  const hasMissingCityRegionCode = [...cityObjectIds].some((id) => !cityRegionCode.has(id));
  const neededRegionCodes = new Set(cityRegionCode.values());
  const hasMissingRegionName = [...neededRegionCodes].some((code) => !regionNameByCode.has(code));
  if (!hasMissingCityRegionCode && !hasMissingRegionName) {
    console.log(
      `Collected cities: ${cityByObjectId.size}. Regions: ${regionByObjectId.size}. Mapped by ZIP path; skipping AS_ADM_HIERARCHY.`,
    );
    return { cityByObjectId, cityRegionCode, regionNameByCode };
  }

  console.log(`Collected cities: ${cityByObjectId.size}. Regions: ${regionByObjectId.size}. Parsing AS_ADM_HIERARCHY...`);
  idx = 0;
  for (const e of admEntries) {
    idx++;
    if (idx === 1 || idx % 10 === 0) console.log(`ADM_HIERARCHY (zip): ${idx}/${admEntries.length}`);
    const stream = e.stream();
    await parseXmlStream(stream, (node) => {
      const attrs = upperAttrs(node.attributes as unknown as Record<string, unknown>);
      const objectIdRaw = attrs.OBJECTID;
      const regionCode = attrs.REGIONCODE;
      const isActive = attrs.ISACTIVE;

      if (!objectIdRaw || !regionCode) return;
      if (isActive && isActive !== '1') return;

      let objectId: bigint;
      try {
        objectId = BigInt(objectIdRaw);
      } catch {
        return;
      }

      if (cityObjectIds.has(objectId)) {
        cityRegionCode.set(objectId, String(regionCode));
      }

      if (regionObjectIds.has(objectId)) {
        const regionObj = regionByObjectId.get(objectId);
        if (regionObj) {
          regionNameByCode.set(String(regionCode), formatRegionName(regionObj.name, regionObj.typeName));
        }
      }
    });
  }

  return { cityByObjectId, cityRegionCode, regionNameByCode };
}

async function walkFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  const stack: string[] = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
      } else if (e.isFile()) {
        out.push(full);
      }
    }
  }
  return out;
}

async function parseXmlStream(stream: NodeJS.ReadableStream, onOpenTag: (node: sax.Tag) => void) {
  await new Promise<void>((resolve, reject) => {
    const parser = sax.createStream(true, {});
    parser.on('opentag', onOpenTag);
    parser.on('end', () => resolve());
    parser.on('error', (e) => reject(e));
    stream.on('error', (e) => reject(e));
    stream.pipe(parser);
  });
}

function upperAttrs(attrs: Record<string, unknown>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(attrs)) {
    const key = String(k).toUpperCase();
    if (typeof v === 'string') {
      out[key] = v;
    } else if (typeof v === 'object' && v && 'value' in v) {
      // sax can sometimes wrap attributes
      const wrapped = (v as { value?: unknown }).value;
      if (typeof wrapped === 'string') out[key] = wrapped;
    } else if (v != null) {
      out[key] = String(v);
    }
  }
  return out;
}

function formatRegionName(name: string, typeName: string) {
  const type = typeName.trim();
  const n = name.trim();
  if (!type) return n;

  // Most GAR exports use short typename like "обл", "край", "Респ", "г"
  // We keep a human-friendly but predictable formatting.
  if (type.toLowerCase() === 'г') return `г ${n}`;
  if (type.toLowerCase() === 'респ') return `Республика ${n}`;
  if (type.toLowerCase() === 'обл') return `${n} область`;
  if (type.toLowerCase() === 'край') return `${n} край`;
  if (type.toLowerCase() === 'аобл') return `${n} автономная область`;
  if (type.toLowerCase() === 'аокр') return `${n} автономный округ`;
  return `${type} ${n}`;
}

function normalizeCityName(rawName: string, typeName: string) {
  const t = typeName.trim().toLowerCase();
  let n = rawName.trim();

  // For municipality records like "город Майкоп" (type "г.о.") we want the actual city name.
  if (t === 'г.о.') {
    const lower = n.toLowerCase();
    if (lower.startsWith('город ')) {
      n = n.slice(5).trim();
    }
  }

  return n;
}

function isSupportedAddrObject(level: number, typeName: string) {
  const t = typeName.trim().toLowerCase();
  // GAR: most cities are LEVEL=5, TYPENAME="г".
  // Federal cities (Moscow, Saint Petersburg, Sevastopol) are subjects, i.e. LEVEL=1, but still TYPENAME="г".
  if (t === 'г' && (level === 5 || level === 1)) return true;
  // Additional address object levels to keep in our locations directory (see GAR OBJECT_LEVELS).
  if (level === 2 || level === 3 || level === 4 || level === 6) return true;
  return false;
}

async function unzipToTemp(zipPath: string) {
  let baseTmp = DEFAULT_TMP_DIR;
  try {
    await mkdir(baseTmp, { recursive: true });
  } catch {
    baseTmp = tmpdir();
    console.log(`Temp dir not available, fallback to system tmp: ${baseTmp}`);
  }

  const folder = join(baseTmp, `gar-import-${Date.now()}`);
  await mkdir(folder, { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(zipPath);
    stream.on('error', (e) => reject(e));
    stream
      .pipe(unzipper.Extract({ path: folder }))
      .on('close', () => resolve())
      .on('error', (e: unknown) => reject(e));
  });

  return folder;
}

async function parseAddrObjFiles(addrObjFiles: string[]) {
  const cityByObjectId = new Map<bigint, Omit<CityRow, 'regionCode' | 'regionName'>>();
  const cityObjectIds = new Set<bigint>();
  const regionByObjectId = new Map<bigint, { name: string; typeName: string }>();
  const regionObjectIds = new Set<bigint>();

  for (const file of addrObjFiles) {
    await parseXmlStream(createReadStream(file), (node) => {
        const attrs = upperAttrs(node.attributes as unknown as Record<string, unknown>);
        const objectIdRaw = attrs.OBJECTID;
        const objectGuid = attrs.OBJECTGUID;
        const name = attrs.NAME;
        const typeName = attrs.TYPENAME;
        const levelRaw = attrs.LEVEL;
        const isActual = attrs.ISACTUAL;
        const isActive = attrs.ISACTIVE;

        if (!objectIdRaw || !objectGuid || !name || !typeName || !levelRaw) return;
        if (isActual !== '1' || isActive !== '1') return;

        let objectId: bigint;
        try {
          objectId = BigInt(objectIdRaw);
        } catch {
          return;
        }

        const level = Number(levelRaw);
        if (!Number.isFinite(level)) return;

        if (isSupportedAddrObject(level, typeName)) {
          const normalizedName = normalizeCityName(name, typeName);
          cityByObjectId.set(objectId, {
            garObjectId: objectId,
            objectGuid,
            name: normalizedName,
            typeName,
            level,
          });
          cityObjectIds.add(objectId);
          return;
        }

        // Regions: build a mapping later by REGIONCODE
        if (level === 1) {
          regionByObjectId.set(objectId, { name, typeName });
          regionObjectIds.add(objectId);
        }
    });
  }

  return { cityByObjectId, cityObjectIds, regionByObjectId, regionObjectIds };
}

async function parseAdmHierarchyFiles(
  admFiles: string[],
  cityObjectIds: Set<bigint>,
  regionObjectIds: Set<bigint>,
  regionByObjectId: Map<bigint, { name: string; typeName: string }>,
) {
  const cityRegionCode = new Map<bigint, string>();
  const regionNameByCode = new Map<string, string>();

  for (const file of admFiles) {
    await parseXmlStream(createReadStream(file), (node) => {
        const attrs = upperAttrs(node.attributes as unknown as Record<string, unknown>);
        const objectIdRaw = attrs.OBJECTID;
        const regionCode = attrs.REGIONCODE;
        const isActive = attrs.ISACTIVE;

        if (!objectIdRaw || !regionCode) return;
        if (isActive && isActive !== '1') return;

        let objectId: bigint;
        try {
          objectId = BigInt(objectIdRaw);
        } catch {
          return;
        }

        if (cityObjectIds.has(objectId)) {
          cityRegionCode.set(objectId, String(regionCode));
        }

        if (regionObjectIds.has(objectId)) {
          const regionObj = regionByObjectId.get(objectId);
          if (regionObj) {
            regionNameByCode.set(String(regionCode), formatRegionName(regionObj.name, regionObj.typeName));
          }
        }
    });
  }

  return { cityRegionCode, regionNameByCode };
}

async function parseFromNestedRegionZips(rootDir: string) {
  const allFiles = await walkFiles(rootDir);
  const regionZipFiles = allFiles.filter(
    (p) => p.toUpperCase().endsWith('.ZIP') && !p.toUpperCase().includes('00APT.ZIP'),
  );
  if (regionZipFiles.length === 0) {
    throw new Error('GAR files not found (expected XML files or nested region ZIPs)');
  }

  console.log(`Detected nested region ZIPs: ${regionZipFiles.length}. Parsing AS_ADDR_OBJ first...`);

  const cityByObjectId = new Map<bigint, Omit<CityRow, 'regionCode' | 'regionName'>>();
  const cityObjectIds = new Set<bigint>();
  const regionByObjectId = new Map<bigint, { name: string; typeName: string }>();
  const regionObjectIds = new Set<bigint>();

  let zipIdx = 0;
  for (const zipPath of regionZipFiles) {
    zipIdx++;
    if (zipIdx % 10 === 0 || zipIdx === 1) {
      console.log(`ADDR_OBJ: ${zipIdx}/${regionZipFiles.length}`);
    }
    const dir = await unzipper.Open.file(zipPath);
    const entries = dir.files.filter((f) => f.type === 'File');
    const addrObj = entries.find((f) => f.path.toUpperCase().startsWith('AS_ADDR_OBJ_') && f.path.toUpperCase().endsWith('.XML'));
    if (!addrObj) continue;

    await parseXmlStream(addrObj.stream(), (node) => {
      const attrs = upperAttrs(node.attributes as unknown as Record<string, unknown>);
      const objectIdRaw = attrs.OBJECTID;
      const objectGuid = attrs.OBJECTGUID;
      const name = attrs.NAME;
      const typeName = attrs.TYPENAME;
      const levelRaw = attrs.LEVEL;
      const isActual = attrs.ISACTUAL;
      const isActive = attrs.ISACTIVE;

      if (!objectIdRaw || !objectGuid || !name || !typeName || !levelRaw) return;
      if (isActual !== '1' || isActive !== '1') return;

      let objectId: bigint;
      try {
        objectId = BigInt(objectIdRaw);
      } catch {
        return;
      }

      const level = Number(levelRaw);
      if (!Number.isFinite(level)) return;

      if (isSupportedAddrObject(level, typeName)) {
        const normalizedName = normalizeCityName(name, typeName);
        cityByObjectId.set(objectId, {
          garObjectId: objectId,
          objectGuid,
          name: normalizedName,
          typeName,
          level,
        });
        cityObjectIds.add(objectId);
        return;
      }

      if (level === 1) {
        regionByObjectId.set(objectId, { name, typeName });
        regionObjectIds.add(objectId);
      }
    });
  }

  if (cityByObjectId.size === 0 && regionByObjectId.size === 0) {
    throw new Error(
      'Nested region archives found, but no AS_ADDR_OBJ_*.XML was detected. ' +
        'This source likely contains 1C-specific *.FI files (not supported). ' +
        'Use the official GAR XML dumps (fias-file.nalog.ru .../gar_xml.zip or .../gar_delta_xml.zip).',
    );
  }

  console.log(`Collected cities: ${cityByObjectId.size}. Regions: ${regionByObjectId.size}. Parsing AS_ADM_HIERARCHY...`);

  const cityRegionCode = new Map<bigint, string>();
  const regionNameByCode = new Map<string, string>();

  zipIdx = 0;
  for (const zipPath of regionZipFiles) {
    zipIdx++;
    if (zipIdx % 10 === 0 || zipIdx === 1) {
      console.log(`ADM_HIERARCHY: ${zipIdx}/${regionZipFiles.length}`);
    }
    const dir = await unzipper.Open.file(zipPath);
    const entries = dir.files.filter((f) => f.type === 'File');
    const adm = entries.find((f) => f.path.toUpperCase().startsWith('AS_ADM_HIERARCHY_') && f.path.toUpperCase().endsWith('.XML'));
    if (!adm) continue;

    await parseXmlStream(adm.stream(), (node) => {
      const attrs = upperAttrs(node.attributes as unknown as Record<string, unknown>);
      const objectIdRaw = attrs.OBJECTID;
      const regionCode = attrs.REGIONCODE;
      const isActive = attrs.ISACTIVE;

      if (!objectIdRaw || !regionCode) return;
      if (isActive && isActive !== '1') return;

      let objectId: bigint;
      try {
        objectId = BigInt(objectIdRaw);
      } catch {
        return;
      }

      if (cityObjectIds.has(objectId)) {
        cityRegionCode.set(objectId, String(regionCode));
      }

      if (regionObjectIds.has(objectId)) {
        const regionObj = regionByObjectId.get(objectId);
        if (regionObj) {
          regionNameByCode.set(String(regionCode), formatRegionName(regionObj.name, regionObj.typeName));
        }
      }
    });
  }

  return { cityByObjectId, cityRegionCode, regionNameByCode };
}

async function persistGarCities(
  cities: GarCitySnapshotRow[],
  opts: { mode: string; sourceLabel: string | null },
): Promise<void> {
  console.log(`Ready to reconcile: ${cities.length} city row(s).`);

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  try {
    const stats = await reconcileGarCities(prisma, cities, opts, 1000);

    console.log('Reconcile stats:');
    console.log(`  run id:           ${stats.runId}`);
    console.log(`  snapshot rows:    ${stats.snapshotCount}`);
    console.log(`  added:            ${stats.addedCount}`);
    console.log(`  updated:          ${stats.updatedCount}`);
    console.log(`  deactivated:      ${stats.deactivatedCount}`);
    console.log(`  reactivated:      ${stats.reactivatedCount}`);
    console.log('Done.');
  } finally {
    await prisma.$disconnect();
  }
}

function buildCitiesFromParsed(
  cityByObjectId: Map<bigint, Omit<CityRow, 'regionCode' | 'regionName'>>,
  cityRegionCode: Map<bigint, string>,
  regionNameByCode: Map<string, string>,
): GarCitySnapshotRow[] {
  const cities: GarCitySnapshotRow[] = [];
  for (const [objectId, city] of cityByObjectId.entries()) {
    const regionCode = cityRegionCode.get(objectId);
    if (!regionCode) continue;
    const regionName = regionNameByCode.get(regionCode);
    if (!regionName) continue;
    cities.push({
      ...city,
      regionCode,
      regionName,
    });
  }
  return cities;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const mode = args.mode ?? 'auto';
  const outDir = args.outDir
    ? String(args.outDir)
    : mode === 'full'
      ? DEFAULT_FULL_OUT_DIR
      : join(process.cwd(), '.tmp', 'gar');

  let rootDir = args.dir;
  let tempDir: string | null = null;
  const cleanup = args.cleanup ?? true;

  if (!args.zip && !args.dir) {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
    const prisma = new PrismaClient({ adapter });
    let cityCount = 0;
    try {
      cityCount = await prisma.city.count();
    } finally {
      await prisma.$disconnect();
    }

    if (mode === 'full') {
      console.log(`City rows in DB: ${cityCount}. Mode: ${mode}. Will download: gar_xml.zip`);
      args.zip = await downloadGarArchive(outDir, 'gar_xml.zip');
    } else if (mode === 'delta') {
      if (cityCount === 0) {
        throw new Error(
          'City table is empty. Delta/reconcile requires an existing snapshot baseline. ' +
            'Run with --mode full (gar_xml.zip) for the initial load.',
        );
      }
      console.log(`City rows in DB: ${cityCount}. Mode: ${mode}. Will download: gar_xml.zip`);
      args.zip = await downloadGarArchive(outDir, 'gar_xml.zip');
    } else {
      // auto
      if (cityCount === 0) {
        throw new Error(
          'City table is empty. Run `--mode full` once to seed cities from the official GAR XML full dump ' +
            '(downloads gar_xml.zip; use --out to store it on an external drive).',
        );
      }
      console.log(`City rows in DB: ${cityCount}. Mode: ${mode}. Will download: gar_xml.zip`);
      args.zip = await downloadGarArchive(outDir, 'gar_xml.zip');
    }
  }

  if (args.zip) {
    const parsed = await parseFromLocalGarXmlZip(args.zip);

    const cities = buildCitiesFromParsed(
      parsed.cityByObjectId,
      parsed.cityRegionCode,
      parsed.regionNameByCode,
    );

    await persistGarCities(cities, {
      mode,
      sourceLabel: args.zip ?? null,
    });

    return;
  }

  if (!rootDir) {
    throw new Error('Root directory not resolved');
  }

  const st = await stat(rootDir);
  if (!st.isDirectory()) {
    throw new Error('Provided --dir is not a directory');
  }

  console.log(`Scanning files under: ${rootDir}`);
  const allFiles = await walkFiles(rootDir);
  const addrObjFiles = allFiles.filter((p) => p.toUpperCase().includes('AS_ADDR_OBJ_') && p.toUpperCase().endsWith('.XML'));
  const admFiles = allFiles.filter((p) => p.toUpperCase().includes('AS_ADM_HIERARCHY_') && p.toUpperCase().endsWith('.XML'));

  let cityByObjectId: Map<bigint, Omit<CityRow, 'regionCode' | 'regionName'>>;
  let cityRegionCode: Map<bigint, string>;
  let regionNameByCode: Map<string, string>;

  if (addrObjFiles.length > 0 && admFiles.length > 0) {
    console.log(`Found ${addrObjFiles.length} AS_ADDR_OBJ file(s) and ${admFiles.length} AS_ADM_HIERARCHY file(s).`);
    console.log('Parsing AS_ADDR_OBJ...');
    const parsedAddr = await parseAddrObjFiles(addrObjFiles);
    console.log(`Collected cities: ${parsedAddr.cityByObjectId.size}. Regions: ${parsedAddr.regionByObjectId.size}.`);
    console.log('Parsing AS_ADM_HIERARCHY...');
    const parsedAdm = await parseAdmHierarchyFiles(admFiles, parsedAddr.cityObjectIds, parsedAddr.regionObjectIds, parsedAddr.regionByObjectId);
    console.log(`Mapped city->regionCode: ${parsedAdm.cityRegionCode.size}. regionCode->regionName: ${parsedAdm.regionNameByCode.size}.`);

    cityByObjectId = parsedAddr.cityByObjectId;
    cityRegionCode = parsedAdm.cityRegionCode;
    regionNameByCode = parsedAdm.regionNameByCode;
  } else {
    // 00.zip from some mirrors contains nested region zips (01.ZIP, 02.ZIP, ...).
    const parsed = await parseFromNestedRegionZips(rootDir);
    cityByObjectId = parsed.cityByObjectId;
    cityRegionCode = parsed.cityRegionCode;
    regionNameByCode = parsed.regionNameByCode;
    console.log(`Mapped city->regionCode: ${cityRegionCode.size}. regionCode->regionName: ${regionNameByCode.size}.`);
  }

  const cities = buildCitiesFromParsed(cityByObjectId, cityRegionCode, regionNameByCode);

  await persistGarCities(cities, {
    mode,
    sourceLabel: rootDir,
  });

  if (tempDir && cleanup) {
    console.log(`Cleaning up temp dir: ${tempDir}`);
    await rm(tempDir, { recursive: true, force: true });
  }
}

void main().catch((e) => {
  console.error('Import failed:', e);
  process.exitCode = 1;
});

