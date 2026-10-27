import { describe, expect, it } from 'vitest';
import { defaultBackupPath, parseBackupArgs, pgDumpArgs } from './backup-city-dump';

describe('backup-city-dump', () => {
  const now = new Date('2026-10-27T10:00:00Z');

  it('defaultBackupPath uses date stamp', () => {
    expect(defaultBackupPath(now)).toBe('backups/cities-20261027.dump');
  });

  it('parseBackupArgs reads --out and falls back to default', () => {
    expect(parseBackupArgs([], now)).toEqual({ out: 'backups/cities-20261027.dump' });
    expect(parseBackupArgs(['--out', '/tmp/x.dump'], now)).toEqual({ out: '/tmp/x.dump' });
  });

  it('pgDumpArgs dumps City, Region and RegionalCapital data in custom format', () => {
    const args = pgDumpArgs('postgres://db', 'out.dump');
    expect(args).toEqual([
      'postgres://db',
      '-t',
      '"City"',
      '-t',
      '"Region"',
      '-t',
      '"RegionalCapital"',
      '--data-only',
      '--no-owner',
      '--no-privileges',
      '-F',
      'c',
      '-f',
      'out.dump',
    ]);
  });
});
