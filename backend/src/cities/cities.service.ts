import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildDisplayName,
  locationRowRank,
  normalizeCityNameForKey,
  placeNameLikePatterns,
  publicCityName,
  regionMatchesQuery,
} from './city-suggest.lib';
import { compareRegionalCapitals } from './regional-capital-order';
import type {
  RegionalCapitalAdminItemDto,
  RegionalCapitalItemDto,
} from './dto/regional-capital.dto';
import type {
  CityImportEventDto,
  CityImportRunDto,
} from './dto/city-admin.dto';
import type {
  CitySuggestItemDto,
  PlaceSuggestItemDto,
  PlaceSuggestPageDto,
} from './dto/city.dto';

function normalizeQuery(input: string) {
  let q = input.trim();
  const prefixes = [
    'г ',
    'г. ',
    'город ',
    'г.о ',
    'г.о. ',
    'р-н ',
    'район ',
    'пос ',
    'пос. ',
    'п ',
    'п. ',
    'с ',
    'с. ',
    'д ',
    'д. ',
  ];

  while (true) {
    const lower = q.toLowerCase();
    const matched = prefixes.find(
      (p) => lower.startsWith(p) && q.length > p.length,
    );
    if (!matched) return q;
    q = q.slice(matched.length).trim();
  }
}

function cityNameQuery(q: string) {
  const honorific = 'город-герой ';
  const clauses = [{ name: { startsWith: q, mode: 'insensitive' as const } }];
  if (!q.toLowerCase().startsWith(honorific.trim())) {
    clauses.push({
      name: { startsWith: `${honorific}${q}`, mode: 'insensitive' as const },
    });
  }
  return clauses;
}

function clampLimit(value: number, max = 20) {
  if (!Number.isFinite(value)) return 10;
  return Math.min(max, Math.max(1, Math.floor(value)));
}

type SuggestCityRow = {
  id: string;
  name: string;
  regionCode: string;
  regionName: string;
  typeName: string;
};

function toSuggestItem(row: SuggestCityRow): CitySuggestItemDto {
  const name = publicCityName(row.name);
  return {
    id: row.id,
    name,
    regionCode: row.regionCode,
    regionName: row.regionName,
    displayName: buildDisplayName({ ...row, name }),
  };
}

function isPrismaUniqueViolation(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

const capitalCitySelect = {
  id: true,
  name: true,
  regionCode: true,
  regionName: true,
  typeName: true,
  status: true,
} as const;

type RegionalCapitalRow = {
  featured: boolean;
  sortOrder: number;
  city: SuggestCityRow;
};

const regionalCapitalSelect = {
  featured: true,
  sortOrder: true,
  city: { select: capitalCitySelect },
} as const;

function toPublicCapital(row: RegionalCapitalRow): RegionalCapitalItemDto {
  return {
    ...toSuggestItem(row.city),
    featured: row.featured === true,
  };
}

function toAdminItem(row: RegionalCapitalRow): RegionalCapitalAdminItemDto {
  return {
    ...toPublicCapital(row),
    sortOrder: row.sortOrder,
  };
}

function sortRegionalCapitalRows(rows: RegionalCapitalRow[]) {
  return [...rows].sort((a, b) =>
    compareRegionalCapitals(
      {
        featured: a.featured,
        sortOrder: a.sortOrder,
        name: publicCityName(a.city.name),
      },
      {
        featured: b.featured,
        sortOrder: b.sortOrder,
        name: publicCityName(b.city.name),
      },
    ),
  );
}

@Injectable()
export class CitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async suggest(
    qRaw: string,
    limitRaw: number,
    maxLimit = 20,
  ): Promise<CitySuggestItemDto[]> {
    const q = normalizeQuery(qRaw);
    const limit = clampLimit(limitRaw, maxLimit);

    if (q.length === 0) {
      return [];
    }

    const ranked = await this.rankedCityRows(
      q,
      Math.min(1000, Math.max(limit * 12, 300)),
    );
    return ranked.slice(0, limit).map((row) => toSuggestItem(row));
  }

  private async rankedCityRows(q: string, take: number) {
    const rows = await this.prisma.city.findMany({
      where: {
        status: 'ACTIVE',
        level: { in: [1, 2, 3, 4, 5, 6] },
        OR: cityNameQuery(q),
      },
      select: {
        id: true,
        name: true,
        regionCode: true,
        regionName: true,
        typeName: true,
        level: true,
      },
      orderBy: [{ name: 'asc' }],
      // Короткий префикс вроде «казан» иначе обрезается по алфавиту до «Казань».
      take,
    });

    const byKey = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const key = `${normalizeCityNameForKey(row.name)}|${row.regionCode}|${row.typeName}|${row.level}`;
      const prev = byKey.get(key);
      if (!prev || locationRowRank(row) < locationRowRank(prev)) {
        byKey.set(key, row);
      }
    }

    return [...byKey.values()].sort((a, b) => {
      const r = locationRowRank(a) - locationRowRank(b);
      if (r !== 0) return r;
      return a.name.localeCompare(b.name, 'ru');
    });
  }

  /**
   * Страница подсказки мест. CASE ранга совпадает с locationRowRank.
   * Индекс: lower(name) text_pattern_ops, поэтому сравнение через lower + LIKE, не ILIKE.
   */
  private pagePlaceCities(q: string, limit: number, offset: number) {
    const { prefix, heroPrefix } = placeNameLikePatterns(q);
    const nameMatch = heroPrefix
      ? Prisma.sql`(
          lower(name) LIKE lower(${prefix}) ESCAPE '\\'
          OR lower(name) LIKE lower(${heroPrefix}) ESCAPE '\\'
        )`
      : Prisma.sql`lower(name) LIKE lower(${prefix}) ESCAPE '\\'`;

    return this.prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        regionCode: string;
        regionName: string;
      }>
    >`
      SELECT id::text AS id, name, "regionCode", "regionName"
      FROM (
        SELECT DISTINCT ON (lower(btrim(name)), "regionCode", "typeName", level)
          id,
          name,
          "regionCode",
          "regionName",
          "typeName",
          level,
          CASE
            WHEN "typeName" = 'г' AND level = 5 THEN 0
            WHEN "typeName" = 'г' AND level = 1 THEN 1
            WHEN level = 6 THEN 2
            WHEN level = 4 THEN 3
            WHEN level = 3 THEN 4
            WHEN level = 2 THEN 5
            ELSE 99
          END
          + CASE
              WHEN lower(btrim("typeName")) = 'автодорога' THEN 50
              ELSE 0
            END AS rank
        FROM "City"
        WHERE status = 'ACTIVE'::"CityStatus"
          AND level IN (1, 2, 3, 4, 5, 6)
          AND ${nameMatch}
        ORDER BY lower(btrim(name)), "regionCode", "typeName", level, id
      ) AS places
      ORDER BY rank, name, id
      LIMIT ${limit + 1}
      OFFSET ${offset}
    `;
  }

  async suggestPlaces(
    qRaw: string,
    limitRaw: number,
    offsetRaw = 0,
  ): Promise<PlaceSuggestPageDto> {
    const q = normalizeQuery(qRaw);
    const limit = clampLimit(limitRaw, 50);
    const offset = Math.max(0, Math.floor(offsetRaw) || 0);
    if (q.trim().length < 2) {
      return { regions: [], cities: [], hasMore: false };
    }

    const regionRowsPromise: Promise<
      Array<{ regionCode: string; regionName: string }>
    > =
      offset === 0
        ? this.prisma.region.findMany({
            select: { regionCode: true, regionName: true },
          })
        : Promise.resolve([]);

    const [pageRows, regionRows] = await Promise.all([
      this.pagePlaceCities(q, limit, offset),
      regionRowsPromise,
    ]);

    const hasMore = pageRows.length > limit;
    const cities: PlaceSuggestItemDto[] = pageRows
      .slice(0, limit)
      .map((city) => ({
        kind: 'city',
        id: city.id,
        name: publicCityName(city.name),
        regionCode: city.regionCode,
        regionName: city.regionName,
      }));

    const regions: PlaceSuggestItemDto[] = regionRows
      .filter((row) => regionMatchesQuery(row.regionName, q))
      .sort((a, b) => a.regionName.localeCompare(b.regionName, 'ru'))
      .map((row) => ({
        kind: 'region',
        name: row.regionName,
        regionCode: row.regionCode,
        regionName: row.regionName,
      }));

    return { regions, cities, hasMore };
  }

  async listCapitals(): Promise<RegionalCapitalItemDto[]> {
    const rows = await this.prisma.regionalCapital.findMany({
      where: { city: { status: 'ACTIVE' } },
      select: regionalCapitalSelect,
    });
    return sortRegionalCapitalRows(rows).map((row) => toPublicCapital(row));
  }

  async listAdminRegionalCapitals(): Promise<RegionalCapitalAdminItemDto[]> {
    const rows = await this.prisma.regionalCapital.findMany({
      select: regionalCapitalSelect,
    });
    return sortRegionalCapitalRows(rows).map((row) => toAdminItem(row));
  }

  async setRegionalCapitalFeatured(
    cityId: string,
    featured: boolean,
  ): Promise<RegionalCapitalAdminItemDto> {
    const row = await this.prisma.regionalCapital.findUnique({
      where: { cityId },
      select: regionalCapitalSelect,
    });
    if (!row) {
      throw new NotFoundException('Regional capital not found');
    }
    if (row.featured === featured) {
      return toAdminItem(row);
    }

    let sortOrder = 0;
    if (featured) {
      const max = await this.prisma.regionalCapital.aggregate({
        where: { featured: true },
        _max: { sortOrder: true },
      });
      sortOrder = (max._max.sortOrder ?? 0) + 1;
    }

    const updated = await this.prisma.regionalCapital.update({
      where: { cityId },
      data: { featured, sortOrder },
      select: regionalCapitalSelect,
    });
    return toAdminItem(updated);
  }

  async moveRegionalCapital(
    cityId: string,
    direction: 'up' | 'down',
  ): Promise<RegionalCapitalAdminItemDto> {
    const row = await this.prisma.regionalCapital.findUnique({
      where: { cityId },
      select: regionalCapitalSelect,
    });
    if (!row) {
      throw new NotFoundException('Regional capital not found');
    }
    if (!row.featured) {
      throw new BadRequestException('City is not in the first tier');
    }

    const featured = sortRegionalCapitalRows(
      await this.prisma.regionalCapital.findMany({
        where: { featured: true },
        select: regionalCapitalSelect,
      }),
    );
    const index = featured.findIndex((item) => item.city.id === cityId);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || swapIndex < 0 || swapIndex >= featured.length) {
      return toAdminItem(row);
    }

    const ordered = [...featured];
    const [moved] = ordered.splice(index, 1);
    if (!moved) return toAdminItem(row);
    ordered.splice(swapIndex, 0, moved);

    await this.prisma.$transaction(
      ordered.map((item, position) =>
        this.prisma.regionalCapital.update({
          where: { cityId: item.city.id },
          data: { sortOrder: position + 1 },
        }),
      ),
    );

    return toAdminItem({ ...row, sortOrder: swapIndex + 1 });
  }

  async addRegionalCapital(
    cityId: string,
  ): Promise<RegionalCapitalAdminItemDto> {
    const city = await this.prisma.city.findUnique({
      where: { id: cityId },
      select: capitalCitySelect,
    });
    if (!city || city.status !== 'ACTIVE') {
      throw new BadRequestException('City is not available');
    }

    try {
      await this.prisma.regionalCapital.create({ data: { cityId } });
    } catch (error) {
      if (isPrismaUniqueViolation(error)) {
        throw new ConflictException('City is already a regional capital');
      }
      throw error;
    }

    return { ...toSuggestItem(city), featured: false, sortOrder: 0 };
  }

  async removeRegionalCapital(cityId: string): Promise<CitySuggestItemDto> {
    const row = await this.prisma.regionalCapital.findUnique({
      where: { cityId },
      select: { city: { select: capitalCitySelect } },
    });
    if (!row) {
      throw new NotFoundException('Regional capital not found');
    }
    await this.prisma.regionalCapital.delete({ where: { cityId } });
    return toSuggestItem(row.city);
  }

  async listImportRuns(limitRaw = 50): Promise<CityImportRunDto[]> {
    const limit = Math.min(100, Math.max(1, Math.floor(limitRaw)));
    const rows = await this.prisma.cityImportRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      mode: row.mode,
      sourceLabel: row.sourceLabel,
      startedAt: row.startedAt.toISOString(),
      finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
      snapshotCount: row.snapshotCount,
      addedCount: row.addedCount,
      deactivatedCount: row.deactivatedCount,
      reactivatedCount: row.reactivatedCount,
      updatedCount: row.updatedCount,
    }));
  }

  async listImportRunEvents(runId: string): Promise<CityImportEventDto[]> {
    const run = await this.prisma.cityImportRun.findUnique({
      where: { id: runId },
      select: { id: true },
    });
    if (!run) {
      throw new NotFoundException('Import run not found');
    }

    const rows = await this.prisma.cityImportEvent.findMany({
      where: { runId },
      orderBy: [{ eventType: 'asc' }, { name: 'asc' }],
      take: 500,
    });

    return rows.map((row) => ({
      id: row.id,
      runId: row.runId,
      cityId: row.cityId,
      garObjectId: row.garObjectId.toString(),
      eventType: row.eventType,
      name: row.name,
      regionCode: row.regionCode,
      regionName: row.regionName,
      previousStatus: row.previousStatus,
      newStatus: row.newStatus,
    }));
  }
}
