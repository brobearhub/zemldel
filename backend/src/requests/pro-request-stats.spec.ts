import { describe, expect, it } from 'vitest';
import { foldProRequestStats } from './pro-request-stats';

describe('foldProRequestStats', () => {
  it('раскладывает статусы, суммирует всего и берёт самую позднюю дату', () => {
    expect(
      foldProRequestStats([
        { status: 'NEW', count: 2, latestUpdatedAt: '2026-10-01T10:00:00.000Z' },
        { status: 'DISCUSSING', count: 1, latestUpdatedAt: new Date('2026-10-08T12:00:00.000Z') },
        { status: 'TERMS_AGREED', count: 1, latestUpdatedAt: '2026-10-02T00:00:00.000Z' },
        { status: 'CLOSED', count: 4, latestUpdatedAt: '2026-09-01T00:00:00.000Z' },
        { status: 'UNKNOWN', count: 9, latestUpdatedAt: '2026-12-01T00:00:00.000Z' },
      ]),
    ).toEqual({
      total: 8,
      byStatus: {
        NEW: 2,
        DISCUSSING: 1,
        TERMS_AGREED: 1,
        ACTIVE: 0,
        ACCEPTANCE_PENDING: 0,
        ACCEPTED: 0,
        COMPLETED: 0,
        CANCELLED: 0,
        CLOSED: 4,
      },
      latestUpdatedAt: '2026-10-08T12:00:00.000Z',
    });
  });

  it('на пустом агрегате отдаёт нули и отсутствие активности', () => {
    const stats = foldProRequestStats([]);
    expect(stats.total).toBe(0);
    expect(stats.latestUpdatedAt).toBeNull();
    expect(stats.byStatus.NEW).toBe(0);
    expect(stats.byStatus.CLOSED).toBe(0);
  });
});
