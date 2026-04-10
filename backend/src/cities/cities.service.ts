import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CitySuggestItemDto } from './dto/city.dto';

function normalizeQuery(input: string) {
  const q = input.trim();
  if (q.toLowerCase().startsWith('г ')) return q.slice(2).trim();
  if (q.toLowerCase().startsWith('город ')) return q.slice(5).trim();
  return q;
}

function clampLimit(value: number) {
  if (!Number.isFinite(value)) return 10;
  return Math.min(20, Math.max(1, Math.floor(value)));
}

function normalizeCityNameForKey(name: string) {
  return name.trim().toLowerCase();
}

function cityRowRank(row: { typeName: string; level: number }) {
  // Prefer concrete city records over municipality shells.
  if (row.typeName === 'г' && row.level === 5) return 0;
  if (row.typeName === 'г' && row.level === 1) return 1; // federal cities
  if (row.typeName === 'г.о.' && row.level === 3) return 2; // city district municipality (e.g. Майкоп)
  return 99;
}

@Injectable()
export class CitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async suggest(qRaw: string, limitRaw: number): Promise<CitySuggestItemDto[]> {
    const q = normalizeQuery(qRaw);
    const limit = clampLimit(limitRaw);

    if (q.length === 0) {
      return [];
    }

    const rows = await this.prisma.city.findMany({
      where: {
        OR: [
          {
            typeName: 'г',
            level: { in: [5, 1] },
            name: {
              startsWith: q,
              mode: 'insensitive',
            },
          },
          {
            typeName: 'г.о.',
            level: 3,
            name: {
              startsWith: q,
              mode: 'insensitive',
            },
          },
        ],
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
      take: Math.min(200, limit * 8),
    });

    const byKey = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const key = `${normalizeCityNameForKey(row.name)}|${row.regionCode}`;
      const prev = byKey.get(key);
      if (!prev || cityRowRank(row) < cityRowRank(prev)) {
        byKey.set(key, row);
      }
    }

    const deduped = [...byKey.values()].sort((a, b) =>
      a.name.localeCompare(b.name, 'ru'),
    );
    return deduped.slice(0, limit).map((row) => ({
      id: row.id,
      name: row.name,
      regionCode: row.regionCode,
      regionName: row.regionName,
      displayName: (() => {
        const city = row.name.trim();
        const region = row.regionName.trim();
        const cityKey = normalizeCityNameForKey(city);
        const regionKey = normalizeCityNameForKey(region);
        if (regionKey.includes(cityKey)) return `г ${city}`;
        return `г ${city}, ${region}`;
      })(),
    }));
  }
}
