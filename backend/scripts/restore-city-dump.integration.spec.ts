import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { STAGING_TABLE, mergeCityStaging } from './restore-city-dump';

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('restore-city-dump integration', () => {
  it('preserves prod City.id on garObjectId match (FK-safe merge)', async () => {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
    const prisma = new PrismaClient({ adapter });

    const cityId = randomUUID();
    const objectGuid = randomUUID();
    const garObjectId = '9000000000000';
    const email = `city-restore-test-${randomUUID()}@example.com`;

    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`DROP TABLE IF EXISTS "${STAGING_TABLE}"`);
        await tx.$executeRawUnsafe(`
          CREATE TEMP TABLE "${STAGING_TABLE}" (
            LIKE "City" INCLUDING DEFAULTS
          ) ON COMMIT DROP
        `);

        await tx.$executeRawUnsafe(`
          INSERT INTO "City" (
            id, "garObjectId", "objectGuid", name, "typeName", level,
            "regionCode", "regionName", status, "createdAt", "updatedAt"
          ) VALUES (
            '${cityId}'::uuid,
            ${garObjectId},
            '${objectGuid}'::uuid,
            'Old Name',
            'г',
            5,
            '77',
            'Москва',
            'ACTIVE'::"CityStatus",
            NOW(),
            NOW()
          )
        `);

        await tx.user.create({
          data: {
            email,
            customerCityId: cityId,
          },
        });

        const stagingId = randomUUID();
        const stagingGuid = randomUUID();
        await tx.$executeRawUnsafe(`
          INSERT INTO "${STAGING_TABLE}" (
            id, "garObjectId", "objectGuid", name, "typeName", level,
            "regionCode", "regionName", status, "createdAt", "updatedAt"
          ) VALUES (
            '${stagingId}'::uuid,
            ${garObjectId},
            '${stagingGuid}'::uuid,
            'New Name',
            'г',
            5,
            '77',
            'Москва',
            'ACTIVE'::"CityStatus",
            NOW(),
            NOW()
          )
        `);

        const stats = await mergeCityStaging(tx as unknown as PrismaClient);
        expect(stats.updated).toBe(1);
        expect(stats.inserted).toBe(0);

        const city = await tx.city.findUniqueOrThrow({ where: { id: cityId } });
        expect(city.name).toBe('New Name');
        expect(city.id).toBe(cityId);

        const user = await tx.user.findUniqueOrThrow({ where: { email } });
        expect(user.customerCityId).toBe(cityId);

        throw new Error('rollback');
      });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'rollback') {
        throw error;
      }
    } finally {
      await prisma.$disconnect();
    }
  });
});
