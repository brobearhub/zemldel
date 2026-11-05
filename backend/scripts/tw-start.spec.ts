import { execFileSync, spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const temporaryRoots: string[] = [];

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'backend-start-'));
  temporaryRoots.push(root);
  for (const dir of ['scripts', 'dist/src', 'bin'])
    mkdirSync(join(root, dir), { recursive: true });
  copyFileSync(
    resolve('scripts/tw_start.sh'),
    join(root, 'scripts/tw_start.sh'),
  );
  writeFileSync(join(root, 'dist/src/main.js'), 'console.log("APP_STARTED");');
  writeFileSync(
    join(root, 'bin/npm'),
    '#!/bin/sh\n[ "$*" = "run db:migrate:deploy" ] || exit 99\necho "$MIGRATION_OUTPUT"\nexit "$MIGRATION_EXIT"\n',
    { mode: 0o755 },
  );
  return root;
}

function start(
  root: string,
  exitCode = '0',
  output = 'No pending migrations to apply.',
) {
  return spawnSync('sh', [join(root, 'scripts/tw_start.sh')], {
    cwd: tmpdir(),
    env: {
      ...process.env,
      PATH: `${join(root, 'bin')}:${process.env.PATH}`,
      MIGRATION_EXIT: exitCode,
      MIGRATION_OUTPUT: output,
    },
    encoding: 'utf8',
    timeout: 5_000,
  });
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe('container startup', () => {
  it.each([
    'No pending migrations to apply.',
    'All migrations have been successfully applied.',
  ])('starts Node after successful migration result: %s', (output) => {
    const result = start(fixture(), '0', output);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Migrations complete; starting backend');
    expect(result.stdout.match(/APP_STARTED/g)).toHaveLength(1);
  });

  it('preserves migration errors and does not start Node', () => {
    const result = start(fixture(), '7', 'Database unavailable');
    expect(result.status).toBe(7);
    expect(result.stderr).toContain('Migration failed (exit 7)');
    expect(result.stdout).not.toContain('APP_STARTED');
  });

  it('fails before accessing the database if the build artifact is missing', () => {
    const root = fixture();
    rmSync(join(root, 'dist/src/main.js'));
    const result = start(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Missing dist/src/main.js');
    expect(result.stdout).not.toContain('Checking and applying');
  });

  it('uses valid POSIX shell syntax for both entry scripts', () => {
    for (const script of ['tw_build.sh', 'tw_start.sh']) {
      expect(() =>
        execFileSync('sh', ['-n', resolve('scripts', script)]),
      ).not.toThrow();
    }
  });
});
