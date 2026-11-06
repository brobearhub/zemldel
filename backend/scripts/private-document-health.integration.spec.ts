import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { readCleanupStats } from './private-document-health';

describe('cleanup health age calculation against PostgreSQL', () => {
  it('detects retrying deletions and expired uploads, allowing upload grace', async () => {
    const prisma = new PrismaService();
    const userId = randomUUID();
    const now = Date.now();
    try {
      // Future notBefore keeps the real worker away from these synthetic jobs.
      const baseline = await readCleanupStats(prisma);
      await prisma.passportObjectCleanup.createMany({
        data: [
          { reason: 'DELETE', minutes: 20 },
          { reason: 'UNCOMMITTED_UPLOAD', minutes: 30 },
          { reason: 'UNCOMMITTED_UPLOAD', minutes: 80 },
        ].map(({ reason, minutes }) => ({
          objectKey: `passports/_health-qa/${randomUUID()}`,
          userId,
          reason,
          createdAt: new Date(now - minutes * 60_000),
          notBefore: new Date(now + 86400_000),
        })),
      });
      const stats = await readCleanupStats(prisma);
      expect(stats.pending).toBe(baseline.pending + 3);
      expect(stats.overdue).toBe(baseline.overdue + 2);
      expect(stats.oldestOverdueSeconds).toBeGreaterThanOrEqual(1200);
    } finally {
      await prisma.passportObjectCleanup.deleteMany({ where: { userId } });
      await prisma.$disconnect();
    }
  });
});
