import { describe, expect, it, vi } from 'vitest';
import { RequestsService } from './requests.service';

describe('customer requests with documents', () => {
  it('uses one parameterized document query and returns only request IDs', async () => {
    const queryRaw = vi
      .fn()
      .mockResolvedValue([{ id: 'contract' }, { id: 'stage' }]);
    const service = new RequestsService(
      { $queryRaw: queryRaw } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(service.listMineWithDocuments('customer-1')).resolves.toEqual([
      'contract',
      'stage',
    ]);
    expect(queryRaw).toHaveBeenCalledOnce();
    const query = queryRaw.mock.calls[0][0] as {
      values: unknown[];
      sql: string;
    };
    expect(query.values).toContain('customer-1');
    expect(query.sql).toContain('"RequestContractFile"');
    expect(query.sql).toContain('"RequestDocumentRequest"');
    expect(query.sql).toContain('"RequestWorkStageFile"');
    expect(query.sql).toContain('"RequestWorkStageDocSlot"');
    expect(query.sql).not.toContain('customer-1');
  });
});
