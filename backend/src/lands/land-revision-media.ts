import { ConflictException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

/** The caller holds the listing lock and applies the content revision in this transaction. */
export async function applyRevisionMedia(
  tx: Prisma.TransactionClient,
  listingId: string,
  orderedMediaIds: string[],
) {
  if (orderedMediaIds.length) {
    const retained = await tx.$executeRaw`
      UPDATE "LandMedia" AS media
      SET "revisionOnly" = false, position = (ordered.ordinal - 1)::integer
      FROM unnest(${orderedMediaIds}::uuid[]) WITH ORDINALITY AS ordered(id, ordinal)
      WHERE media."listingId" = ${listingId}::uuid AND media.id = ordered.id
    `;
    if (retained !== orderedMediaIds.length) {
      throw new ConflictException('Состав файлов объявления изменился');
    }
  }
  await tx.$executeRaw`
    WITH removed AS (
      DELETE FROM "LandMedia"
      WHERE "listingId" = ${listingId}::uuid AND id <> ALL(${orderedMediaIds}::uuid[])
      RETURNING "storageKey"
    )
    INSERT INTO "LandObjectCleanup" ("objectKey", "notBefore")
    SELECT "storageKey", CURRENT_TIMESTAMP AT TIME ZONE 'UTC' FROM removed
    ON CONFLICT ("objectKey") DO NOTHING
  `;
}
