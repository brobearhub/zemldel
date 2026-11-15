import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, describe, expect, it } from 'vitest';
import { ProviderDocumentsService } from './provider-documents.service';
import { ContractFilesService } from '../contract-files/contract-files.service';

describe.skipIf(!process.env.DATABASE_URL)('provider document library', () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  afterAll(() => prisma.$disconnect());

  it('isolates providers, moves files between one-level folders and keeps request copies after library deletion', async () => {
    const rollback = new Error('rollback fixtures');
    await expect(
      prisma.$transaction(
        async (tx) => {
          const user = await tx.user.create({
            data: { email: `document-library-${randomUUID()}@example.com` },
          });
          const customer = await tx.user.create({
            data: { email: `document-library-${randomUUID()}@example.com` },
          });
          const provider = await tx.provider.create({
            data: {
              name: 'Library test',
              slug: `library-${randomUUID()}`,
              type: 'COMPANY',
            },
          });
          const otherProvider = await tx.provider.create({
            data: {
              name: 'Other library',
              slug: `library-${randomUUID()}`,
              type: 'COMPANY',
            },
          });
          const auth = {
            getServiceManagementContext: (actor: string) =>
              Promise.resolve({
                isPlatformAdmin: actor === 'admin',
                providerId: actor === 'other' ? otherProvider.id : provider.id,
              }),
          };
          const objects = new Map<string, Buffer>();
          const storage = {
            putObject: ({ Key, Body }: { Key: string; Body: Buffer }) => {
              objects.set(Key, Body);
              return Promise.resolve();
            },
            getObject: (key: string) =>
              Promise.resolve({
                Body: Object.assign(Readable.from([objects.get(key)!]), {
                  transformToByteArray: () =>
                    Promise.resolve(objects.get(key)!),
                }),
              }),
            deleteObject: (key: string) => {
              objects.delete(key);
              return Promise.resolve();
            },
          };
          const db = new Proxy(tx, {
            get(target, property) {
              return property === '$transaction'
                ? (run: (value: typeof tx) => unknown) => run(tx)
                : Reflect.get(target, property);
            },
          });
          const library = new ProviderDocumentsService(
            db as never,
            auth as never,
            storage as never,
          );
          const contracts = new ContractFilesService(
            db as never,
            auth as never,
            storage as never,
          );
          const folder = await library.saveFolder(user.id, 'Шаблоны');
          await expect(
            library.saveFolder(user.id, '../вложенная'),
          ).rejects.toThrow('Название папки');
          const bytes = Buffer.from('spreadsheet contents');
          const {
            created: [source],
          } = await library.upload(
            user.id,
            [
              {
                originalname: 'Расчёт.xlsx',
                mimetype:
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                buffer: bytes,
                size: bytes.length,
              } as Express.Multer.File,
            ],
            folder.id,
          );
          expect(await library.list(user.id)).toMatchObject({
            files: [
              {
                id: source.id,
                folderId: folder.id,
                originalName: 'Расчёт.xlsx',
              },
            ],
          });
          expect(await library.list('other')).toEqual({
            folders: [],
            files: [],
          });
          await expect(library.download('other', source.id)).rejects.toThrow(
            'Документ не найден',
          );
          await expect(
            library.uploadSource('other', source.id),
          ).rejects.toThrow('Документ не найден');
          await expect(library.deleteFile('other', source.id)).rejects.toThrow(
            'Документ не найден',
          );
          await expect(
            library.deleteFolder('other', folder.id),
          ).rejects.toThrow('Папка не найдена');
          await expect(library.list('admin')).rejects.toThrow('недоступны');
          const otherFolder = await library.saveFolder('other', 'Чужая папка');
          await expect(
            library.move(user.id, source.id, otherFolder.id),
          ).rejects.toThrow('Папка не найдена');
          await library.move(user.id, source.id, null);
          expect((await library.list(user.id)).files[0].folderId).toBeNull();
          await library.move(user.id, source.id, folder.id);
          await library.saveFolder(user.id, 'Договоры', folder.id);
          await library.deleteFolder(user.id, folder.id);
          expect((await library.list(user.id)).files[0].folderId).toBeNull();

          const order = await tx.request.create({
            data: {
              customerUserId: customer.id,
              providerId: provider.id,
              lockedAt: new Date(),
              status: 'DISCUSSING',
            },
          });
          const foreignOrder = await tx.request.create({
            data: {
              customerUserId: customer.id,
              providerId: otherProvider.id,
              lockedAt: new Date(),
              status: 'DISCUSSING',
            },
          });
          const file = await library.uploadSource(user.id, source.id);
          expect(file.buffer).toEqual(bytes);
          await expect(
            contracts.uploadForProvider({
              actorUserId: user.id,
              requestId: foreignOrder.id,
              files: [file],
            }),
          ).rejects.toThrow('Forbidden');
          const {
            created: [attachment],
          } = await contracts.uploadForProvider({
            actorUserId: user.id,
            requestId: order.id,
            files: [file],
            visibleToCustomer: false,
          });
          const operationId = randomUUID();
          const bundle = await contracts.uploadBundleForProvider({
            actorUserId: user.id,
            requestId: order.id,
            document: file,
            operationId,
          });
          expect(
            await contracts.uploadBundleForProvider({
              actorUserId: user.id,
              requestId: order.id,
              document: file,
              operationId,
            }),
          ).toEqual(bundle);
          expect(await library.requestIds(user.id)).toEqual([order.id]);
          expect(await library.requestIds('other')).toEqual([]);
          await library.deleteFile(user.id, source.id);
          expect((await library.list(user.id)).files).toEqual([]);
          const saved = await tx.requestContractFile.findUniqueOrThrow({
            where: { id: attachment.id },
          });
          expect(saved.visibleToCustomer).toBe(false);
          expect(objects.get(saved.storageRelPath)).toEqual(bytes);
          expect(
            await tx.requestContractFile.count({
              where: { bundleId: bundle.bundleId },
            }),
          ).toBe(1);
          expect(objects.size).toBe(2);
          await tx.request.update({
            where: { id: order.id },
            data: { lockedAt: null },
          });
          expect(await library.requestIds(user.id)).toEqual([]);
          throw rollback;
        },
        { timeout: 30000 },
      ),
    ).rejects.toBe(rollback);
  }, 30000);
});
