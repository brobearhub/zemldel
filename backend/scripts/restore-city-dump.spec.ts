import { describe, expect, it } from 'vitest';
import {
  detectDumpFormat,
  parseRestoreArgs,
  rewriteCityCopyToStaging,
  stripPgDumpMetaCommands,
} from './restore-city-dump';

describe('restore-city-dump', () => {
  it('parseRestoreArgs reads --file and --dry-run', () => {
    expect(parseRestoreArgs(['--file', '../backups/city.dump', '--dry-run'])).toEqual({
      file: '../backups/city.dump',
      dryRun: true,
    });
  });

  it('detectDumpFormat recognizes custom, sql and sql.gz', () => {
    expect(detectDumpFormat('backups/city-20260827.dump')).toBe('custom');
    expect(detectDumpFormat('backups/city.sql')).toBe('sql');
    expect(detectDumpFormat('backups/city.sql.gz')).toBe('sql.gz');
  });

  it('stripPgDumpMetaCommands removes pg16 restrict markers', () => {
    const input = '\\restrict abc\nCOPY public."City" FROM stdin;\n\\unrestrict abc\n';
    expect(stripPgDumpMetaCommands(input)).toBe('COPY public."City" FROM stdin;\n');
  });

  it('rewriteCityCopyToStaging retargets COPY to staging table', () => {
    const input =
      'COPY public."City" (id, "garObjectId") FROM stdin;\n' +
      'uuid\t1\n\\.\n';
    expect(rewriteCityCopyToStaging(input)).toContain('COPY public."_CityRestoreStaging"');
    expect(rewriteCityCopyToStaging(input)).not.toContain('COPY public."City"');
  });

  it('rewriteCityCopyToStaging fails when City COPY is missing', () => {
    expect(() => rewriteCityCopyToStaging('SELECT 1;')).toThrow(
      'Dump does not contain COPY data for public."City".',
    );
  });
});
