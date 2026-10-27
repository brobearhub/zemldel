import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { DUMP_TABLES, resolvePgTool } from './restore-city-dump';

export type BackupArgs = {
  out: string;
};

export function defaultBackupPath(now = new Date()): string {
  const stamp = now.toISOString().slice(0, 10).replaceAll('-', '');
  return `backups/cities-${stamp}.dump`;
}

export function parseBackupArgs(argv: string[], now = new Date()): BackupArgs {
  const out: BackupArgs = { out: defaultBackupPath(now) };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') {
      out.out = argv[i + 1] ?? out.out;
      i++;
    }
  }
  return out;
}

/** Только данные справочника: "City", "Region", "RegionalCapital". Формат custom для cities:restore. */
export function pgDumpArgs(databaseUrl: string, outPath: string): string[] {
  return [
    databaseUrl,
    ...DUMP_TABLES.flatMap(({ table }) => ['-t', `"${table}"`]),
    '--data-only',
    '--no-owner',
    '--no-privileges',
    '-F',
    'c',
    '-f',
    outPath,
  ];
}

async function main() {
  const args = parseBackupArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const outPath = resolve(args.out);
  await mkdir(dirname(outPath), { recursive: true });

  console.log(`Dumping ${DUMP_TABLES.map(({ table }) => `"${table}"`).join(', ')} → ${outPath}`);
  const result = spawnSync(
    resolvePgTool('pg_dump'),
    pgDumpArgs(process.env.DATABASE_URL, outPath),
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(`pg_dump failed: ${(result.stderr || result.stdout).trim()}`);
  }

  const { size } = await stat(outPath);
  console.log(`Done: ${(size / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Restore: npm run cities:restore -- --file ${args.out}`);
}

function isDirectCliRun(): boolean {
  const entry = process.argv[1] ?? '';
  return entry.endsWith('backup-city-dump.ts');
}

if (isDirectCliRun()) {
  void main().catch((error) => {
    console.error('Backup failed:', error);
    process.exitCode = 1;
  });
}
