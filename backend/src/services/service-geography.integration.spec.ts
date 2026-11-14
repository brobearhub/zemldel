import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { ProvidersService } from '../providers/providers.service';
import { ServicesService } from './services.service';

describe.skipIf(!process.env.DATABASE_URL)(
  'service and provider geography on PostgreSQL',
  () => {
    const ownerId = randomUUID();
    const providerId = randomUUID();
    const categoryId = randomUUID();
    const cityIds = [randomUUID(), randomUUID()];
    const regionCodes = cityIds.map((id) => id.slice(0, 8));
    const slug = `qa-geography-${providerId}`;
    let db: PrismaService;
    let services: ServicesService;
    let providers: ProvidersService;

    beforeAll(async () => {
      db = new PrismaService();
      await db.user.create({
        data: { id: ownerId, email: `geography-${ownerId}@example.com` },
      });
      await db.provider.create({
        data: {
          id: providerId,
          ownerUserId: ownerId,
          name: 'Geography test',
          type: 'INDIVIDUAL',
          slug,
        },
      });
      await db.serviceCategory.create({
        data: {
          id: categoryId,
          name: 'Geography test',
          shortName: 'Geography',
          slug: `qa-${categoryId}`,
        },
      });
      await db.city.createMany({
        data: cityIds.map((id, index) => ({
          id,
          garObjectId: BigInt('0x' + id.replaceAll('-', '').slice(0, 12)),
          objectGuid: id,
          name: index === 0 ? 'Екатеринбург' : 'Челябинск',
          typeName: 'г',
          level: 5,
          regionCode: regionCodes[index],
          regionName:
            index === 0 ? 'Свердловская область' : 'Челябинская область',
        })),
      });
      services = new ServicesService(db, {} as never, {} as never, {} as never);
      providers = new ProvidersService(
        db,
        {} as never,
        {} as never,
        {} as never,
      );
    });

    afterAll(async () => {
      await db.service.deleteMany({ where: { providerId } });
      await db.billingAccount.deleteMany({ where: { providerId } });
      await db.provider.deleteMany({ where: { id: providerId } });
      await db.serviceCategory.deleteMany({ where: { id: categoryId } });
      await db.city.deleteMany({ where: { id: { in: cityIds } } });
      await db.user.deleteMany({ where: { id: ownerId } });
      await db.$disconnect();
    });

    it('normalizes creation and updates, and keeps the provider linked to only published service geography', async () => {
      const cityPlace = { kind: 'city' as const, cityId: cityIds[0] };
      const regionPlace = {
        kind: 'region' as const,
        regionCode: regionCodes[0],
      };
      const otherCity = { kind: 'city' as const, cityId: cityIds[1] };
      const create = (
        places: (typeof cityPlace)[],
        status: 'DRAFT' | 'PUBLISHED' = 'PUBLISHED',
      ) =>
        services.createService(
          {
            categoryId,
            title: 'Geography test',
            price: '1000',
            places,
            status,
          },
          { providerId },
        );

      const draft = await create([otherCity], 'DRAFT');
      expect(
        (await providers.getPublicProviderProfile(providerId)).serviceGeography,
      ).toEqual([]);
      const first = await services.createService(
        {
          categoryId,
          title: 'Region service',
          price: '1000',
          status: 'PUBLISHED',
          places: [cityPlace, regionPlace],
        },
        { providerId },
      );
      expect(first.places).toMatchObject([
        { kind: 'region', regionCode: regionCodes[0] },
      ]);
      expect(
        await db.serviceCity.count({ where: { serviceId: first.id } }),
      ).toBe(0);
      expect(
        (await services.getServices({ cityId: cityIds[0] })).some(
          (item) => item.id === first.id,
        ),
      ).toBe(true);

      // Старые записи тоже должны отображаться без дублирования.
      await db.serviceCity.create({
        data: { serviceId: first.id, cityId: cityIds[0] },
      });
      expect((await services.getServiceById(first.id))?.places).toHaveLength(1);
      const second = await create([cityPlace]);
      const geography = async () =>
        (await providers.getPublicProviderProfile(providerId)).serviceGeography;
      expect(await geography()).toMatchObject([
        {
          id: first.id,
          title: first.title,
          places: [{ kind: 'region', regionCode: regionCodes[0] }],
        },
        {
          id: second.id,
          title: second.title,
          places: [{ kind: 'city', cityId: cityIds[0] }],
        },
      ]);
      expect(
        (await providers.getPublicProviderProfileBySlug(slug)).serviceGeography,
      ).toEqual(await geography());

      await services.updateService(
        first.id,
        { places: [cityPlace, regionPlace, otherCity] },
        { providerId },
      );
      expect(
        (await db.serviceCity.findMany({ where: { serviceId: first.id } })).map(
          (link) => link.cityId,
        ),
      ).toEqual([cityIds[1]]);
      expect(await geography()).toMatchObject([
        {
          id: first.id,
          places: [
            { kind: 'region', regionCode: regionCodes[0] },
            { kind: 'city', cityId: cityIds[1] },
          ],
        },
        { id: second.id, places: [{ kind: 'city', cityId: cityIds[0] }] },
      ]);

      await services.updateService(
        first.id,
        { allRussia: true, places: [] },
        { providerId },
      );
      expect(await geography()).toMatchObject([
        { id: first.id, places: [{ name: 'Вся Россия', regionCode: 'RU' }] },
        { id: second.id, places: [{ kind: 'city', cityId: cityIds[0] }] },
      ]);
      await services.updateService(
        first.id,
        { status: 'ARCHIVED' },
        { providerId },
      );
      expect(await geography()).toMatchObject([
        { id: second.id, places: [{ kind: 'city', cityId: cityIds[0] }] },
      ]);
      await services.updateService(
        second.id,
        { status: 'DRAFT' },
        { providerId },
      );
      expect(await geography()).toEqual([]);
      await services.updateService(
        draft.id,
        { status: 'PUBLISHED' },
        { providerId },
      );
      expect(await geography()).toMatchObject([
        { id: draft.id, places: [{ kind: 'city', cityId: cityIds[1] }] },
      ]);
      await db.service.delete({ where: { id: draft.id } });
      expect(await geography()).toEqual([]);
    });
  },
);
