import { describe, expect, it, vi } from 'vitest';
import { ChatService } from './chat.service';

function setup() {
  const time = new Date('2026-11-02T10:00:00Z');
  // More than one page, including messages with identical timestamps.
  const rows = Array.from({ length: 103 }, (_, i) => ({
    id: `m${String(i).padStart(3, '0')}`,
    conversationId: 'c',
    createdAt: time,
    senderUserId: 'u',
    clientMessageId: `client-${i}`,
    body: `Message ${i}`,
    sender: { id: 'u', name: 'QA' },
    replyTo: null,
  }));
  const findMany = vi.fn(({ where, orderBy, take }) => {
    let selected = rows.filter(
      (row) =>
        !where.OR ||
        where.OR.some((clause: any) => {
          if (clause.id)
            return (
              row.createdAt.getTime() === clause.createdAt.getTime() &&
              (clause.id.gt ? row.id > clause.id.gt : row.id < clause.id.lt)
            );
          return clause.createdAt.gt
            ? row.createdAt > clause.createdAt.gt
            : row.createdAt < clause.createdAt.lt;
        }),
    );
    if (orderBy[0].createdAt === 'desc') selected = selected.reverse();
    return Promise.resolve(selected.slice(0, take));
  });
  const prisma = {
    message: {
      findFirst: vi.fn(({ where }) =>
        Promise.resolve(
          rows.find(
            (r) =>
              r.id === where.id && r.conversationId === where.conversationId,
          ),
        ),
      ),
      findMany,
    },
  };
  const service = new ChatService(prisma as any, {} as any, {} as any);
  const access = vi
    .spyOn(service as any, 'assertConversationAccess')
    .mockResolvedValue(undefined);
  return { service, rows, access, findMany };
}
describe('message cursor recovery', () => {
  it('returns every missed message across pages without timestamp-tie gaps or duplicates', async () => {
    const { service, access } = setup();
    const got: string[] = [];
    let after = 'm000';
    for (;;) {
      const page = await service.listMessages('u', 'c', { after, limit: 50 });
      got.push(...page.map((m) => m.id));
      if (page.length < 50) break;
      after = page[page.length - 1].id;
    }
    expect(got).toEqual(
      Array.from(
        { length: 102 },
        (_, i) => `m${String(i + 1).padStart(3, '0')}`,
      ),
    );
    expect(new Set(got).size).toBe(102);
    expect(access).toHaveBeenCalledTimes(3);
  });
  it('keeps the latest-page and before-cursor history in chronological order', async () => {
    const { service } = setup();
    const latest = await service.listMessages('u', 'c', { limit: 50 });
    expect(latest[0].id).toBe('m053');
    expect(latest.at(-1)?.id).toBe('m102');
    const older = await service.listMessages('u', 'c', {
      before: 'm053',
      limit: 50,
    });
    expect(older[0].id).toBe('m003');
    expect(older.at(-1)?.id).toBe('m052');
  });
  it('rejects an invalid conversation cursor', async () => {
    const { service } = setup();
    await expect(
      service.listMessages('u', 'c', { after: 'foreign' }),
    ).rejects.toThrow('Invalid after cursor');
  });
});
