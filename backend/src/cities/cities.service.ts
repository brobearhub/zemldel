import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CitySuggestItemDto } from './dto/city.dto';

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

function clampLimit(value: number) {
  if (!Number.isFinite(value)) return 10;
  return Math.min(20, Math.max(1, Math.floor(value)));
}

function normalizeCityNameForKey(name: string) {
  return name.trim().toLowerCase();
}

function locationRowRank(row: { typeName: string; level: number }) {
  const t = row.typeName.trim().toLowerCase();

  // Some GAR types are technically "locations" but are rarely useful for users in UI.
  // Keep them searchable, but push them down in suggestions.
  const lowPriorityTypePenalty = t === 'автодорога' ? 50 : 0;

  // Prefer concrete city records over administrative shells.
  let base = 99;
  if (row.typeName === 'г' && row.level === 5) base = 0;
  else if (row.typeName === 'г' && row.level === 1)
    base = 1; // federal cities (subjects)
  else if (row.level === 6)
    base = 2; // locality / населённый пункт
  else if (row.level === 4)
    base = 3; // settlement
  else if (row.level === 3)
    base = 4; // municipal area / city district
  else if (row.level === 2) base = 5; // admin area

  return base + lowPriorityTypePenalty;
}

function buildDisplayName(row: {
  name: string;
  typeName: string;
  regionName: string;
}) {
  const name = row.name.trim();
  const region = row.regionName.trim();
  const type = row.typeName.trim();
  const prefix = type ? `${type} ` : '';

  const nameKey = normalizeCityNameForKey(name);
  const regionKey = normalizeCityNameForKey(region);
  if (regionKey.includes(nameKey)) return `${prefix}${name}`;
  return `${prefix}${name}, ${region}`;
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
        level: { in: [1, 2, 3, 4, 5, 6] },
        name: {
          startsWith: q,
          mode: 'insensitive',
        },
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
      take: Math.min(200, limit * 12),
    });

    const byKey = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const key = `${normalizeCityNameForKey(row.name)}|${row.regionCode}|${row.typeName}|${row.level}`;
      const prev = byKey.get(key);
      if (!prev || locationRowRank(row) < locationRowRank(prev)) {
        byKey.set(key, row);
      }
    }

    const deduped = [...byKey.values()].sort((a, b) => {
      const r = locationRowRank(a) - locationRowRank(b);
      if (r !== 0) return r;
      return a.name.localeCompare(b.name, 'ru');
    });
    return deduped.slice(0, limit).map((row) => ({
      id: row.id,
      name: row.name,
      regionCode: row.regionCode,
      regionName: row.regionName,
      displayName: buildDisplayName(row),
    }));
  }
}
