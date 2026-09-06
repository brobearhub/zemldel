import { describe, expect, it } from 'vitest';
import { buildSnapshotInsertSql } from './import-gar-cities-reconcile';

describe('import-gar-cities-reconcile', () => {
  it('buildSnapshotInsertSql escapes quotes and formats rows', () => {
    const sql = buildSnapshotInsertSql([
      {
        garObjectId: 123n,
        objectGuid: '11111111-1111-1111-1111-111111111111',
        name: "O'Reilly",
        typeName: 'г',
        level: 5,
        regionCode: '77',
        regionName: 'Москва',
      },
    ]);

    expect(sql).toContain('123');
    expect(sql).toContain("O''Reilly");
    expect(sql).toContain('"_GarCitySnapshot"');
  });
});
