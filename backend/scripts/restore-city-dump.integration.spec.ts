import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import {
  CAPITAL_STAGING_TABLE,
  STAGING_TABLE,
  mergeCityStaging,
  mergeRegionalCapitalStaging,
  syncRegionsFromCities,
} from './restore-city-dump';

const hasDatabase = Boolean(process.env.DATABASE_URL);
// Удалённая БД: стандартных 2 с на старт и 5 с на транзакцию не хватает.
const TX_OPTIONS = { maxWait: 30_000, timeout: 60_000 };

describe.skipIf(!hasDatabase)('restore-city-dump integration', { timeout: 60_000 }, () => {
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
      }, TX_OPTIONS);
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'rollback') {
        throw error;
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  it('fills Region from active City rows', async () => {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
    const prisma = new PrismaClient({ adapter });

    const regionCode = 'T1';

    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`
          INSERT INTO "City" (
            id, "garObjectId", "objectGuid", name, "typeName", level,
            "regionCode", "regionName", status, "createdAt", "updatedAt"
          ) VALUES (
            '${randomUUID()}'::uuid,
            9000000000001,
            '${randomUUID()}'::uuid,
            'Тестовый',
            'г',
            5,
            '${regionCode}',
            'Тестовая область',
            'ACTIVE'::"CityStatus",
            NOW(),
            NOW()
          )
        `);

        await syncRegionsFromCities(tx as unknown as PrismaClient);

        const region = await tx.region.findUniqueOrThrow({ where: { regionCode } });
        expect(region.regionName).toBe('Тестовая область');

        throw new Error('rollback');
      }, TX_OPTIONS);
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'rollback') {
        throw error;
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  it('maps RegionalCapital to target City.id via garObjectId', async () => {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
    const prisma = new PrismaClient({ adapter });

    const targetCityId = randomUUID();
    const sourceCityId = randomUUID();
    const garObjectId = '9000000000002';

    try {
      await prisma.$transaction(async (tx) => {
        for (const staging of [STAGING_TABLE, CAPITAL_STAGING_TABLE]) {
          await tx.$executeRawUnsafe(`DROP TABLE IF EXISTS "${staging}"`);
        }
        await tx.$executeRawUnsafe(`
          CREATE TEMP TABLE "${STAGING_TABLE}" (LIKE "City" INCLUDING DEFAULTS) ON COMMIT DROP
        `);
        await tx.$executeRawUnsafe(`
          CREATE TEMP TABLE "${CAPITAL_STAGING_TABLE}" (LIKE "RegionalCapital" INCLUDING DEFAULTS) ON COMMIT DROP
        `);

        // Город уже есть в целевой БД со своим id; в дампе у него другой id.
        await tx.$executeRawUnsafe(`
          INSERT INTO "City" (
            id, "garObjectId", "objectGuid", name, "typeName", level,
            "regionCode", "regionName", status, "createdAt", "updatedAt"
          ) VALUES (
            '${targetCityId}'::uuid, ${garObjectId}, '${randomUUID()}'::uuid,
            'Столица', 'г', 5, 'T2', 'Тестовая область', 'ACTIVE'::"CityStatus", NOW(), NOW()
          )
        `);
        await tx.$executeRawUnsafe(`
          INSERT INTO "${STAGING_TABLE}" (
            id, "garObjectId", "objectGuid", name, "typeName", level,
            "regionCode", "regionName", status, "createdAt", "updatedAt"
          ) VALUES (
            '${sourceCityId}'::uuid, ${garObjectId}, '${randomUUID()}'::uuid,
            'Столица', 'г', 5, 'T2', 'Тестовая область', 'ACTIVE'::"CityStatus", NOW(), NOW()
          )
        `);
        await tx.$executeRawUnsafe(`
          INSERT INTO "${CAPITAL_STAGING_TABLE}" ("cityId", featured, "sortOrder") VALUES
            ('${sourceCityId}'::uuid, true, 7),
            ('${randomUUID()}'::uuid, false, 0)
        `);

        const stats = await mergeRegionalCapitalStaging(tx as unknown as PrismaClient);
        expect(stats).toEqual({ capitals: 1, capitalsSkipped: 1 });

        const capital = await tx.regionalCapital.findUniqueOrThrow({
          where: { cityId: targetCityId },
        });
        expect(capital.featured).toBe(true);
        expect(capital.sortOrder).toBe(7);

        throw new Error('rollback');
      }, TX_OPTIONS);
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'rollback') {
        throw error;
      }
    } finally {
      await prisma.$disconnect();
    }
  });
});
