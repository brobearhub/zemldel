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
      send.mockClear();
    });
    afterAll(async () => {
      await db.service.deleteMany({ where: { providerId } });
      await db.provider.deleteMany({ where: { id: providerId } });
      await db.serviceCategory.deleteMany({ where: { id: categoryId } });
      await db.user.deleteMany({ where: { id: owner } });
      await db.$disconnect();
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
  },
);
