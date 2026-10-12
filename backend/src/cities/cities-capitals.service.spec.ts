import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CitiesService } from './cities.service';

const cityId = '00000000-0000-0000-0000-000000000001';

const activeCity = {
  id: cityId,
  name: 'Казань',
  regionCode: '16',
  regionName: 'Республика Татарстан',
  typeName: 'г',
  status: 'ACTIVE' as const,
};

function createService(prisma: object) {
  return new CitiesService(prisma as never);
}

describe('CitiesService regional capitals', () => {
  it('reads the public list from RegionalCapital and keeps only active cities', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        city: {
          ...activeCity,
          name: 'Уфа',
          id: '00000000-0000-0000-0000-000000000002',
        },
      },
      { city: activeCity },
    ]);
    const result = await createService({
      regionalCapital: { findMany },
    }).listCapitals();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { city: { status: 'ACTIVE' } },
      }),
    );
    expect(result.map((item) => item.name)).toEqual(['Казань', 'Уфа']);
    expect(result[0]?.displayName).toContain('Казань');
    expect(result.every((item) => item.featured === false)).toBe(true);
  });

  it('shows the first tier before the other capitals, in the saved order', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        featured: false,
        sortOrder: 0,
        city: {
          ...activeCity,
          name: 'Абакан',
          id: '00000000-0000-0000-0000-000000000003',
        },
      },
      {
        featured: true,
        sortOrder: 2,
        city: { ...activeCity, name: 'Казань' },
      },
      {
        featured: true,
        sortOrder: 1,
        city: {
          ...activeCity,
          name: 'Уфа',
          id: '00000000-0000-0000-0000-000000000002',
        },
      },
    ]);
    const result = await createService({
      regionalCapital: { findMany },
    }).listCapitals();

    expect(result.map((item) => item.name)).toEqual([
      'Уфа',
      'Казань',
      'Абакан',
    ]);
    expect(result.map((item) => item.featured)).toEqual([true, true, false]);
  });

  it('hides the hero-city prefix and sorts by the public name', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        featured: false,
        sortOrder: 0,
        city: {
          ...activeCity,
          name: 'город-герой Волгоград',
          regionCode: '34',
          regionName: 'обл. Волгоградская',
        },
      },
      {
        featured: false,
        sortOrder: 0,
        city: {
          ...activeCity,
          id: '00000000-0000-0000-0000-000000000004',
          name: 'Воронеж',
          regionCode: '36',
        },
      },
    ]);
    const result = await createService({
      regionalCapital: { findMany },
    }).listCapitals();

    expect(result.map((item) => item.name)).toEqual(['Волгоград', 'Воронеж']);
    expect(result[0]?.displayName).toContain('Волгоград');
    expect(result[0]?.displayName).not.toContain('город-герой');
  });

  it('returns inactive rows to the admin list', async () => {
    const findMany = vi
      .fn()
      .mockResolvedValue([{ city: { ...activeCity, status: 'INACTIVE' } }]);
    const result = await createService({
      regionalCapital: { findMany },
    }).listAdminRegionalCapitals();

    expect(findMany.mock.calls[0]?.[0]).not.toEqual(
      expect.objectContaining({ where: { city: { status: 'ACTIVE' } } }),
    );
    expect(result).toHaveLength(1);
  });

  it('rejects a missing or inactive city', async () => {
    const create = vi.fn();
    const missing = createService({
      city: { findUnique: vi.fn().mockResolvedValue(null) },
      regionalCapital: { create },
    });
    await expect(missing.addRegionalCapital(cityId)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    const inactive = createService({
      city: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ ...activeCity, status: 'INACTIVE' }),
      },
      regionalCapital: { create },
    });
    await expect(inactive.addRegionalCapital(cityId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a city that is already in the table', async () => {
    const service = createService({
      city: { findUnique: vi.fn().mockResolvedValue(activeCity) },
      regionalCapital: {
        create: vi.fn().mockRejectedValue({ code: 'P2002' }),
      },
    });

    await expect(service.addRegionalCapital(cityId)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('removes a stored capital and reports a missing row', async () => {
    const deleteRow = vi.fn().mockResolvedValue({ cityId });
    const stored = createService({
      regionalCapital: {
        findUnique: vi.fn().mockResolvedValue({ city: activeCity }),
        delete: deleteRow,
      },
    });
    const removed = await stored.removeRegionalCapital(cityId);
    expect(removed.id).toBe(cityId);
    expect(deleteRow).toHaveBeenCalledWith({ where: { cityId } });

    const missing = createService({
      regionalCapital: {
        findUnique: vi.fn().mockResolvedValue(null),
        delete: vi.fn(),
      },
    });
    await expect(missing.removeRegionalCapital(cityId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
