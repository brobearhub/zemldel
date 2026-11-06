import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import type { PrismaService } from '../prisma/prisma.service';
import type { PassportStorageService } from './passport-storage.service';

export type CleanupStats = {
  pending: number;
  overdue: number;
  oldestOverdueSeconds: number;
};

// notBefore is moved on every retry. Measure age from createdAt instead, with
// the upload reservation's one-hour grace period subtracted explicitly.
export async function readCleanupStats(prisma: PrismaService) {
  const rows = await prisma.$queryRaw<CleanupStats[]>`
    WITH jobs AS (
      SELECT GREATEST(0, EXTRACT(EPOCH FROM (NOW() - "createdAt"))
        - CASE WHEN reason = 'UNCOMMITTED_UPLOAD' THEN 3600 ELSE 0 END) AS age
      FROM "PassportObjectCleanup"
    )
    SELECT COUNT(*)::int AS pending,
      COUNT(*) FILTER (WHERE age >= 900)::int AS overdue,
      COALESCE(MAX(age), 0)::int AS "oldestOverdueSeconds"
    FROM jobs
  `;
  return rows[0];
}

export async function checkPrivateDocumentHealth(
  prisma: PrismaService,
  storage: PassportStorageService,
) {
  const [queue, access] = await Promise.allSettled([
    readCleanupStats(prisma),
    (async () => {
      const { client, bucket: Bucket } = storage.getConnection();
      // Read-only reachability/credential check. Object names never leave this
      // process. Actual encrypted write/read/erase has a separate smoke check.
      for (const Prefix of ['passports/', 'documents/']) {
        await client.send(
          new ListObjectsV2Command({ Bucket, Prefix, MaxKeys: 1 }),
        );
      }
    })(),
  ]);
  return {
    checkedAt: new Date().toISOString(),
    ok:
      queue.status === 'fulfilled' &&
      queue.value.overdue === 0 &&
      access.status === 'fulfilled',
    storageReachable: access.status === 'fulfilled',
    cleanup: queue.status === 'fulfilled' ? queue.value : null,
  };
}
