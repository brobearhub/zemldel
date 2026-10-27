import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

export const STAGING_TABLE = '_CityRestoreStaging';
export const REGION_STAGING_TABLE = '_RegionRestoreStaging';
export const CAPITAL_STAGING_TABLE = '_RegionalCapitalRestoreStaging';

/** Таблицы дампа и их staging. "City" обязательна, остальные есть только в дампах cities:backup. */
export const DUMP_TABLES = [
  { table: 'City', staging: STAGING_TABLE },
  { table: 'Region', staging: REGION_STAGING_TABLE },
  { table: 'RegionalCapital', staging: CAPITAL_STAGING_TABLE },
] as const;

export type DumpFormat = 'custom' | 'sql' | 'sql.gz';

export type RestoreArgs = {
  file: string;
  dryRun: boolean;
};

export type RestoreStats = {
  stagingRows: number;
  updated: number;
  inserted: number;
  unchangedInTarget: number;
  regions: number;
  regionsSource: 'dump' | 'city';
  capitals: number;
  capitalsSkipped: number;
};

export function parseRestoreArgs(argv: string[]): RestoreArgs {
  const out: RestoreArgs = { file: '', dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const cur = argv[i];
    if (cur === '--file') {
      out.file = argv[i + 1] ?? '';
      i++;
    }
    if (cur === '--dry-run') {
      out.dryRun = true;
    }
  }
  return out;
}

export function detectDumpFormat(filePath: string): DumpFormat {
  if (filePath.endsWith('.sql.gz')) return 'sql.gz';
  if (filePath.endsWith('.sql')) return 'sql';
  return 'custom';
}

export function stripPgDumpMetaCommands(sql: string): string {
  return sql
    .replace(/^\\restrict .+\r?\n/gm, '')
    .replace(/^\\unrestrict .+\r?\n/gm, '');
}

export function rewriteCityCopyToStaging(sql: string): string {
  let rewritten = stripPgDumpMetaCommands(sql);
  for (const { table, staging } of DUMP_TABLES) {
    // Пробел после кавычки: "Region" не должен задеть "RegionalCapital".
    rewritten = rewritten.replaceAll(
      `COPY public."${table}" `,
      `COPY public."${staging}" `,
    );
  }
  if (!rewritten.includes(`COPY public."${STAGING_TABLE}" `)) {
    throw new Error('Dump does not contain COPY data for public."City".');
  }
  return rewritten;
}

/** PG_BIN_DIR выбирает клиент нужной major-версии, например /opt/homebrew/opt/postgresql@17/bin. */
export function resolvePgTool(tool: 'pg_dump' | 'pg_restore' | 'psql'): string {
  const binDir = process.env.PG_BIN_DIR?.trim();
  if (binDir) return join(binDir, tool);
  const result = spawnSync('which', [tool], { encoding: 'utf8' });
  if (result.status === 0 && result.stdout.trim()) {
    return result.stdout.trim();
  }
  throw new Error(
    `${tool} not found in PATH. Install PostgreSQL client 16+ or use Docker:\n` +
      `  docker run --rm -v "$(pwd)/backups:/backups" postgres:16-alpine ${tool} ...`,
  );
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function materializeStagingSql(
  dumpPath: string,
  format: DumpFormat,
  outSqlPath: string,
): Promise<void> {
  if (format === 'custom') {
    const pgRestore = resolvePgTool('pg_restore');
    const result = spawnSync(
      pgRestore,
      [
        '-a',
        ...DUMP_TABLES.flatMap(({ table }) => ['-t', table]),
        '-f',
        outSqlPath,
        dumpPath,
      ],
      { encoding: 'utf8' },
    );
    if (result.status !== 0) {
      throw new Error(
        `pg_restore failed: ${(result.stderr || result.stdout).trim()}`,
      );
    }
  } else if (format === 'sql.gz') {
    await pipeline(
      createReadStream(dumpPath),
      createGunzip(),
      createWriteStream(outSqlPath),
    );
  } else {
    const raw = await readFile(dumpPath, 'utf8');
    await writeFile(outSqlPath, raw);
  }

  const sql = await readFile(outSqlPath, 'utf8');
  await writeFile(outSqlPath, rewriteCityCopyToStaging(sql));
}

async function createStagingTables(prisma: PrismaClient): Promise<void> {
  for (const { table, staging } of DUMP_TABLES) {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${staging}"`);
    await prisma.$executeRawUnsafe(`
      CREATE UNLOGGED TABLE "${staging}" (
        LIKE "${table}" INCLUDING DEFAULTS
      )
    `);
  }
}

function runPsql(sqlFile: string, databaseUrl: string): void {
  const psql = resolvePgTool('psql');
  const result = spawnSync(
    psql,
    [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-q', '-f', sqlFile],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    throw new Error(`psql failed: ${(result.stderr || result.stdout).trim()}`);
  }
}

async function countStagingRows(
  prisma: PrismaClient,
  stagingTable: string = STAGING_TABLE,
): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    `SELECT COUNT(*)::int AS count FROM "${stagingTable}"`,
  );
  return rows[0]?.count ?? 0;
}

export async function mergeCityStaging(
  prisma: PrismaClient,
): Promise<Pick<RestoreStats, 'updated' | 'inserted' | 'unchangedInTarget'>> {
  const updatedRows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`
    WITH updated AS (
      UPDATE "City" c
      SET
        "objectGuid" = s."objectGuid",
        name = s.name,
        "typeName" = s."typeName",
        level = s.level,
        "regionCode" = s."regionCode",
        "regionName" = s."regionName",
        status = s.status,
        "deactivatedAt" = s."deactivatedAt",
        "updatedAt" = NOW()
      FROM "${STAGING_TABLE}" s
      WHERE c."garObjectId" = s."garObjectId"
      RETURNING c.id
    )
    SELECT COUNT(*)::int AS count FROM updated
  `);

  const insertedRows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`
    WITH inserted AS (
      INSERT INTO "City" (
        id,
        "garObjectId",
        "objectGuid",
        name,
        "typeName",
        level,
        "regionCode",
        "regionName",
        status,
        "deactivatedAt",
        "createdAt",
        "updatedAt"
      )
      SELECT
        gen_random_uuid(),
        s."garObjectId",
        s."objectGuid",
        s.name,
        s."typeName",
        s.level,
        s."regionCode",
        s."regionName",
        s.status,
        s."deactivatedAt",
        COALESCE(s."createdAt", NOW()),
        NOW()
      FROM "${STAGING_TABLE}" s
      WHERE NOT EXISTS (
        SELECT 1 FROM "City" c WHERE c."garObjectId" = s."garObjectId"
      )
      RETURNING id
    )
    SELECT COUNT(*)::int AS count FROM inserted
  `);

  const unchangedRows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`
    SELECT COUNT(*)::int AS count
    FROM "City" c
    WHERE NOT EXISTS (
      SELECT 1 FROM "${STAGING_TABLE}" s WHERE s."garObjectId" = c."garObjectId"
    )
  `);

  return {
    updated: updatedRows[0]?.count ?? 0,
    inserted: insertedRows[0]?.count ?? 0,
    unchangedInTarget: unchangedRows[0]?.count ?? 0,
  };
}

/** Дамп содержит только "City". Справочник субъектов дособирается из него, без DELETE. */
export async function syncRegionsFromCities(prisma: PrismaClient): Promise<number> {
  return prisma.$executeRawUnsafe(`
    INSERT INTO "Region" ("regionCode", "regionName")
    SELECT DISTINCT ON ("regionCode") "regionCode", "regionName"
    FROM "City"
    WHERE status = 'ACTIVE'
      AND btrim("regionCode") <> ''
      AND btrim("regionName") <> ''
    ORDER BY "regionCode", "regionName"
    ON CONFLICT ("regionCode") DO UPDATE SET "regionName" = EXCLUDED."regionName"
  `);
}

/** Регионы из дампа: upsert по regionCode, без DELETE. */
export async function mergeRegionStaging(prisma: PrismaClient): Promise<number> {
  return prisma.$executeRawUnsafe(`
    INSERT INTO "Region" ("regionCode", "regionName")
    SELECT "regionCode", "regionName"
    FROM "${REGION_STAGING_TABLE}"
    WHERE btrim("regionCode") <> '' AND btrim("regionName") <> ''
    ON CONFLICT ("regionCode") DO UPDATE SET "regionName" = EXCLUDED."regionName"
  `);
}

/**
 * Столицы ссылаются на "City".id источника дампа. В целевой БД id другие,
 * поэтому город ищется через garObjectId из staging "City". Без DELETE.
 */
export async function mergeRegionalCapitalStaging(
  prisma: PrismaClient,
): Promise<Pick<RestoreStats, 'capitals' | 'capitalsSkipped'>> {
  const capitals = await prisma.$executeRawUnsafe(`
    INSERT INTO "RegionalCapital" ("cityId", featured, "sortOrder")
    SELECT c.id, s.featured, s."sortOrder"
    FROM "${CAPITAL_STAGING_TABLE}" s
    JOIN "${STAGING_TABLE}" sc ON sc.id = s."cityId"
    JOIN "City" c ON c."garObjectId" = sc."garObjectId"
    ON CONFLICT ("cityId") DO UPDATE SET
      featured = EXCLUDED.featured,
      "sortOrder" = EXCLUDED."sortOrder"
  `);
  const total = await countStagingRows(prisma, CAPITAL_STAGING_TABLE);
  return { capitals, capitalsSkipped: total - capitals };
}

async function dropStagingTables(prisma: PrismaClient): Promise<void> {
  for (const { staging } of DUMP_TABLES) {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${staging}"`);
  }
}

export async function restoreCityDump(
  prisma: PrismaClient,
  dumpPath: string,
  options: { dryRun?: boolean } = {},
): Promise<RestoreStats> {
  const format = detectDumpFormat(dumpPath);
  const tempDir = await mkdtemp(join(tmpdir(), 'city-restore-'));
  const stagingSqlPath = join(tempDir, 'city-staging.sql');

  try {
    console.log(`Dump: ${dumpPath} (${format})`);
    await materializeStagingSql(dumpPath, format, stagingSqlPath);

    await createStagingTables(prisma);
    console.log('Loading staging tables...');
    runPsql(stagingSqlPath, process.env.DATABASE_URL!);

    const stagingRows = await countStagingRows(prisma);
    const stagingRegions = await countStagingRows(prisma, REGION_STAGING_TABLE);
    const stagingCapitals = await countStagingRows(prisma, CAPITAL_STAGING_TABLE);
    console.log(
      `Staging rows: City ${stagingRows}, Region ${stagingRegions}, RegionalCapital ${stagingCapitals}`,
    );
    // Старые дампы содержат только "City": тогда регионы собираются из неё.
    const regionsSource = stagingRegions > 0 ? 'dump' : 'city';

    if (options.dryRun) {
      console.log('Dry run: merge skipped.');
      return {
        stagingRows,
        updated: 0,
        inserted: 0,
        unchangedInTarget: 0,
        regions: 0,
        regionsSource,
        capitals: 0,
        capitalsSkipped: 0,
      };
    }

    console.log('Merging into "City" (no DELETE)...');
    const mergeStats = await mergeCityStaging(prisma);
    const regions =
      regionsSource === 'dump'
        ? await mergeRegionStaging(prisma)
        : await syncRegionsFromCities(prisma);
    const capitalStats = await mergeRegionalCapitalStaging(prisma);
    const stats: RestoreStats = {
      stagingRows,
      ...mergeStats,
      regions,
      regionsSource,
      ...capitalStats,
    };

    console.log('Restore stats:');
    console.log(`  staging rows:     ${stats.stagingRows}`);
    console.log(`  updated:          ${stats.updated}`);
    console.log(`  inserted:         ${stats.inserted}`);
    console.log(`  unchanged (prod): ${stats.unchangedInTarget}`);
    console.log(`  regions synced:   ${stats.regions} (from ${stats.regionsSource})`);
    console.log(`  capitals:         ${stats.capitals}`);
    if (stats.capitalsSkipped > 0) {
      console.log(`  capitals skipped: ${stats.capitalsSkipped} (city not found by garObjectId)`);
    }

    return stats;
  } finally {
    await dropStagingTables(prisma).catch(() => undefined);
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function main() {
  const args = parseRestoreArgs(process.argv.slice(2));
  if (!args.file) {
    throw new Error('Usage: npm run cities:restore -- --file <path-to-dump> [--dry-run]');
  }

  const dumpPath = resolve(args.file);
  if (!(await fileExists(dumpPath))) {
    throw new Error(`Dump file not found: ${dumpPath}`);
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    await restoreCityDump(prisma, dumpPath, { dryRun: args.dryRun });
    console.log('Done.');
  } finally {
    await prisma.$disconnect();
  }
}

function isDirectCliRun(): boolean {
  const entry = process.argv[1] ?? '';
  return entry.endsWith('restore-city-dump.ts');
}

if (isDirectCliRun()) {
  void main().catch((error) => {
    console.error('Restore failed:', error);
    process.exitCode = 1;
  });
}
