import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { PrismaService } from '../prisma/prisma.service';
import { ServicesService } from './services.service';

describe.skipIf(!process.env.DATABASE_URL)(
  'service gallery on PostgreSQL',
  () => {
    const owner = randomUUID();
    const providerId = randomUUID();
    const categoryId = randomUUID();
    const stored = new Map<string, Buffer>();
    const send = vi.fn((command: PutObjectCommand | DeleteObjectCommand) => {
      if (command instanceof PutObjectCommand)
        stored.set(command.input.Key!, command.input.Body as Buffer);
      else stored.delete(command.input.Key!);
      return Promise.resolve({});
    });
    let db: PrismaService;
    let service: ServicesService;
    let serviceId: string;
    const file = (n: number) =>
      ({
        buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, n]),
        mimetype: 'image/png',
      }) as Express.Multer.File;
    const upload = (n: number, provider = providerId) =>
      service.uploadServiceImage({
        actorUserId: owner,
        providerId: provider,
        serviceId,
        file: file(n),
      });
    beforeAll(async () => {
      vi.stubEnv('PLAN_ENFORCEMENT_ENABLED', '1');
      db = new PrismaService();
      await db.user.create({
        data: { id: owner, email: `gallery-${owner}@example.com` },
      });
      await db.provider.create({
        data: {
          id: providerId,
          name: 'Gallery test',
          slug: `qa-gallery-${providerId}`,
          type: 'SELF_EMPLOYED',
          ownerUserId: owner,
        },
      });
      await db.serviceCategory.create({
        data: {
          id: categoryId,
          name: 'Gallery test',
          shortName: 'Gallery',
          slug: `qa-gallery-${categoryId}`,
        },
      });
      service = new ServicesService(
        db,
        {} as never,
        {} as never,
        {
          publicPrefix: 'public/',
          publicCdnBaseUrl: 'https://gallery.example.com',
          requirePublicBucket: () => 'test',
          requirePublicCdnBaseUrl: () => 'https://gallery.example.com',
          client: { send },
        } as never,
      );
    });
    beforeEach(async () => {
      serviceId = randomUUID();
      await db.service.create({
        data: {
          id: serviceId,
          providerId,
          categoryId,
          title: 'Gallery test',
          price: '100',
          status: 'PUBLISHED',
        },
      });
      await db.billingAccount.upsert({
        where: { providerId },
        create: {
          providerId,
          plan: 'BUSINESS',
          planExpiresAt: new Date(Date.now() + 86400000),
        },
        update: {
          plan: 'BUSINESS',
          planExpiresAt: new Date(Date.now() + 86400000),
        },
      });
      send.mockClear();
    });
    afterAll(async () => {
      await db.service.deleteMany({ where: { providerId } });
      await db.billingAccount.deleteMany({ where: { providerId } });
      await db.provider.deleteMany({ where: { id: providerId } });
      await db.serviceCategory.deleteMany({ where: { id: categoryId } });
      await db.user.deleteMany({ where: { id: owner } });
      await db.$disconnect();
      vi.unstubAllEnvs();
    });
    it('allows ten simultaneous uploads, rejects the eleventh, and retries without duplicates', async () => {
      const results = await Promise.allSettled(
        Array.from({ length: 11 }, (_, n) => upload(n)),
      );
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(10);
      const row = await db.service.findUniqueOrThrow({
        where: { id: serviceId },
      });
      expect(row.images).toHaveLength(10);
      expect(row.image).toBe(row.images[0]);
      const fulfilledIndex = results.findIndex(
        (result) => result.status === 'fulfilled',
      );
      expect((await upload(fulfilledIndex)).images).toHaveLength(10);
      expect(
        send.mock.calls.filter(
          ([command]) => command instanceof PutObjectCommand,
        ),
      ).toHaveLength(10);
      expect((await service.getServiceById(serviceId))?.images).toEqual(
        row.images,
      );
    });
    it('preserves a legacy cover, deletes only the selected photo, and promotes the next cover', async () => {
      await db.service.update({
        where: { id: serviceId },
        data: { image: 'https://legacy.example.com/cover.png', images: [] },
      });
      const first = await upload(1);
      const second = await upload(2);
      expect(second.images).toHaveLength(3);
      const result = await service.deleteServiceImage({
        actorUserId: owner,
        providerId,
        serviceId,
        imageUrl: first.images![1],
      });
      expect(result.images).toEqual([second.images![0], second.images![2]]);
      expect(
        send.mock.calls.some(
          ([command]) => command instanceof DeleteObjectCommand,
        ),
      ).toBe(true);
      const next = await service.deleteServiceImage({
        actorUserId: owner,
        providerId,
        serviceId,
      });
      expect(next.image).toBe(second.images![2]);
      expect(next.images).toEqual([second.images![2]]);
    });
    it('rejects another provider and leaves the gallery unchanged on failed storage writes', async () => {
      await expect(upload(1, randomUUID())).rejects.toMatchObject({
        status: 404,
      });
      expect(send).not.toHaveBeenCalled();
      send.mockRejectedValueOnce(new Error('unavailable'));
      await expect(upload(1)).rejects.toMatchObject({ status: 502 });
      expect(
        (await db.service.findUniqueOrThrow({ where: { id: serviceId } }))
          .images,
      ).toEqual([]);
    });
    it('enforces Standard and Lite photo limits and preserves hidden originals', async () => {
      await db.billingAccount.update({
        where: { providerId },
        data: { plan: 'STANDARD' },
      });
      await upload(1);
      await expect(upload(2)).rejects.toThrow();
      await db.billingAccount.update({
        where: { providerId },
        data: { plan: 'LITE' },
      });
      await upload(2);
      await upload(3);
      await expect(upload(4)).rejects.toThrow();
      await db.billingAccount.update({
        where: { providerId },
        data: { plan: 'STANDARD' },
      });
      const publicRow = await service.getServiceById(serviceId);
      expect(publicRow.images).toHaveLength(1);
      expect(
        (await db.service.findUniqueOrThrow({ where: { id: serviceId } }))
          .images,
      ).toHaveLength(3);
      expect(JSON.stringify(publicRow)).not.toContain('billingAccount');
    });
    it('preserves unrestricted geography after downgrade while enforcing badge gates', async () => {
      const cityIds = [randomUUID(), randomUUID()];
      const codes = cityIds.map((id) => id.slice(0, 8));
      try {
        for (let i = 0; i < 2; i++)
          await db.city.create({
            data: {
              id: cityIds[i],
              garObjectId: BigInt(
                '0x' + cityIds[i].replaceAll('-', '').slice(0, 12),
              ),
              objectGuid: cityIds[i],
              name: 'QA city',
              typeName: 'г',
              level: 5,
              regionCode: codes[i],
              regionName: 'QA region ' + i,
            },
          });
        const places = codes.map((regionCode) => ({
          kind: 'region' as const,
          regionCode,
        }));
        await service.updateService(
          serviceId,
          { places, stockBadge: 'Скидка', paletteColor: 'error' },
          { providerId },
        );
        await db.billingAccount.update({
          where: { providerId },
          data: { plan: 'STANDARD' },
        });
        expect(
          (await service.getServiceById(serviceId))?.places.map(
            (p) => p.regionCode,
          ),
        ).toEqual(codes);
        await service.updateService(
          serviceId,
          { places: [...places].reverse() },
          { providerId },
        );
        expect(
          (await service.getServiceById(serviceId))?.places.map(
            (p) => p.regionCode,
          ),
        ).toEqual([...codes].reverse());
        expect(await db.serviceRegion.count({ where: { serviceId } })).toBe(2);
        await expect(
          service.updateService(
            serviceId,
            { allRussia: true, places: [] },
            { providerId },
          ),
        ).resolves.toBeDefined();
        await expect(
          service.updateService(
            serviceId,
            { stockBadge: 'Новая метка' },
            { providerId },
          ),
        ).rejects.toThrow();
        await service.updateService(
          serviceId,
          { places: places.slice(0, 1) },
          { providerId },
        );
        await expect(
          service.updateService(serviceId, { places }, { providerId }),
        ).resolves.toBeDefined();
        await db.billingAccount.update({
          where: { providerId },
          data: { plan: 'BUSINESS' },
        });
        await service.updateService(
          serviceId,
          { allRussia: true, places: [] },
          { providerId },
        );
        expect(
          (await service.getServices({ cityId: cityIds[0] })).some(
            (s) => s.id === serviceId,
          ),
        ).toBe(true);
        await db.billingAccount.update({
          where: { providerId },
          data: { plan: 'STANDARD' },
        });
        expect(await service.getServiceById(serviceId)).toMatchObject({
          allRussia: true,
        });
        expect(
          (await service.getServiceById(serviceId, { providerId }))?.allRussia,
        ).toBe(true);
      } finally {
        await db.city.deleteMany({ where: { id: { in: cityIds } } });
      }
    });
    it('publishes all Standard content while enforcement is paused', async () => {
      vi.stubEnv('PLAN_ENFORCEMENT_ENABLED', '0');
      try {
        await db.billingAccount.update({
          where: { providerId },
          data: { plan: 'STANDARD' },
        });
        await upload(1);
        await upload(2);
        await upload(3);
        await service.updateService(
          serviceId,
          {
            stockBadge: 'Скидка',
            paletteColor: 'error',
            allRussia: true,
            places: [],
          },
          { providerId },
        );
        const publicRow = await service.getServiceById(serviceId);
        expect(publicRow).toMatchObject({
          allRussia: true,
          stockBadge: 'Скидка',
          paletteColor: 'error',
        });
        expect(publicRow?.images).toHaveLength(3);
        expect(
          (await db.service.findUniqueOrThrow({ where: { id: serviceId } }))
            .allRussia,
        ).toBe(true);
      } finally {
        vi.stubEnv('PLAN_ENFORCEMENT_ENABLED', '1');
      }
    });
  },
);
