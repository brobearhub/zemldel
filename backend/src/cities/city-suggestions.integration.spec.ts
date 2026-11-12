import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { CitiesService } from './cities.service';

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('city suggestions with PostgreSQL', () => {
  const schema = `city_suggestions_${randomUUID().replaceAll('-', '')}`;
  let pool: Pool;
  let prisma: PrismaClient;
  let service: CitiesService;
  const ids = new Map<string, string>();

  beforeAll(async () => {
    const connection = {
      connectionString: databaseUrl,
      options: `-c search_path=${schema},public`,
    };
    pool = new Pool(connection);
    await pool.query(`CREATE SCHEMA "${schema}"`);
    await pool.query(
      `CREATE TYPE "${schema}"."CityStatus" AS ENUM ('ACTIVE', 'INACTIVE')`,
    );
    await pool.query(`CREATE TABLE "${schema}"."City" (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      "typeName" TEXT NOT NULL,
      level INTEGER NOT NULL,
      "regionCode" TEXT NOT NULL,
      "regionName" TEXT NOT NULL,
      status "${schema}"."CityStatus" NOT NULL
    )`);
    const fixtures = [
      ['city', 'Екатеринбург', 'г', 5, '66', 'ACTIVE'],
      ['municipality', 'Екатеринбург', 'г.о.', 3, '66', 'ACTIVE'],
      ['same-name-locality', 'еКаТеринбург  ', 'п.', 6, '66', 'ACTIVE'],
      [
        'road-chelyabinsk',
        'Екатеринбург-Челябинск',
        'автодорога',
        6,
        '66',
        'ACTIVE',
      ],
      ['road-tyumen', 'Екатеринбург-Тюмень', ' Автодорога ', 6, '66', 'ACTIVE'],
      ['village', 'Екатеринбургский', 'п.', 6, '66', 'ACTIVE'],
      ['other-region', 'Екатеринбург', 'г', 5, '99', 'ACTIVE'],
      ['standalone-municipality', 'Екатеринбург', 'г.о.', 3, '77', 'ACTIVE'],
      ['inactive', 'Екатеринбургский неактивный', 'г', 5, '66', 'INACTIVE'],
      ['federal', 'Санкт-Петербург', 'г', 1, '78', 'ACTIVE'],
      ['federal-municipality', 'Санкт-Петербург', 'г.о.', 3, '78', 'ACTIVE'],
      ['hero', 'город-герой Волгоград', 'г', 5, '34', 'ACTIVE'],
      ['hero-municipality', 'Волгоград', 'г.о.', 3, '34', 'ACTIVE'],
    ] as const;
    for (const [key, name, type, level, region, status] of fixtures) {
      const id = randomUUID();
      ids.set(key, id);
      await pool.query(
        `INSERT INTO "${schema}"."City" VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, name, type, level, region, 'Свердловская область', status],
      );
    }
    prisma = new PrismaClient({
      adapter: new PrismaPg(connection, { schema }),
    });
    service = new CitiesService({
      city: prisma.city,
      region: {
        findMany: () =>
          Promise.resolve([
            { regionCode: '66', regionName: 'Свердловская область' },
          ]),
      },
      $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) =>
        prisma.$queryRaw(query, ...values),
    } as unknown as PrismaService);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    if (pool) {
      await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await pool.end();
    }
  });

  const expectedKeys = [
    'city',
    'village',
    'other-region',
    'standalone-municipality',
  ];

  it('excludes roads and duplicate administrative records from both searches', async () => {
    const normal = await service.suggest('Екатеринбург', 20);
    const places = await service.suggestPlaces('Екатеринбург', 20);
    const expected = expectedKeys.map((key) => ids.get(key)).sort();
    expect(normal.map((row) => row.id).sort()).toEqual(expected);
    expect(places.cities.map((row) => row.id).sort()).toEqual(expected);
    expect(places.hasMore).toBe(false);
  });

  it('filters before pagination and preserves settlements and different regions', async () => {
    const result: string[] = [];
    for (let offset = 0; offset < expectedKeys.length; offset += 1) {
      const page = await service.suggestPlaces('Екатеринбург', 1, offset);
      expect(page.cities).toHaveLength(1);
      expect(page.hasMore).toBe(offset < expectedKeys.length - 1);
      result.push(page.cities[0].id!);
    }
    expect(result.sort()).toEqual(
      expectedKeys.map((key) => ids.get(key)).sort(),
    );
  });

  it('keeps federal cities, hero cities and region search', async () => {
    for (const [query, key] of [
      ['Санкт-Петербург', 'federal'],
      ['Волгоград', 'hero'],
    ]) {
      expect((await service.suggest(query, 10)).map((row) => row.id)).toEqual([
        ids.get(key),
      ]);
      expect(
        (await service.suggestPlaces(query, 10)).cities.map((row) => row.id),
      ).toEqual([ids.get(key)]);
    }
    expect((await service.suggestPlaces('Сверд', 10)).regions).toEqual([
      {
        kind: 'region',
        name: 'Свердловская область',
        regionCode: '66',
        regionName: 'Свердловская область',
      },
    ]);
  });
});
