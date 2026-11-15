import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ContractFilesService } from './contract-files.service';
import { RequestDocumentRequestsService } from '../request-document-requests/request-document-requests.service';

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('customer access to provider attachments', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl! }),
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('lists and downloads uploaded attachments only for the selected deal, and follows deletion', async () => {
    const rollback = new Error('rollback test data');
    await expect(
      prisma.$transaction(
        async (tx) => {
          const customerId = randomUUID();
          const providerUserId = randomUUID();
          const otherCustomerId = randomUUID();
          const providerId = randomUUID();
          const oldProviderId = randomUUID();
          await tx.user.createMany({
            data: [customerId, providerUserId, otherCustomerId].map((id) => ({
              id,
              email: `provider-files-${id}@example.com`,
            })),
          });
          await tx.provider.createMany({
            data: [providerId, oldProviderId].map((id) => ({
              id,
              name: 'Provider files test',
              slug: `provider-files-${id}`,
              type: 'COMPANY',
            })),
          });
          const request = await tx.request.create({
            data: {
              customerUserId: customerId,
              providerId,
              lockedAt: new Date(),
              status: 'DISCUSSING',
            },
          });
          const otherRequest = await tx.request.create({
            data: {
              customerUserId: customerId,
              providerId,
              lockedAt: new Date(),
            },
          });
          const metadata = {
            requestId: request.id,
            providerId,
            originalName: 'private.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1,
            sha256: 'test',
            storageRelPath: 'documents/test/unused',
          };
          const contract = await tx.requestContractFile.create({
            data: metadata,
          });
          const oldFile = await tx.requestContractFile.create({
            data: {
              ...metadata,
              providerId: oldProviderId,
              role: 'PROVIDER_MISC',
            },
          });
          const otherFile = await tx.requestContractFile.create({
            data: {
              ...metadata,
              requestId: otherRequest.id,
              role: 'PROVIDER_MISC',
            },
          });
          const objects = new Map<string, Buffer>();
          const service = new ContractFilesService(
            tx as never,
            {
              getServiceManagementContext: () =>
                Promise.resolve({
                  isPlatformAdmin: false,
                  providerId,
                }),
            } as never,
            {
              putObject: ({ Key, Body }: { Key: string; Body: Buffer }) => {
                objects.set(Key, Body);
                return Promise.resolve();
              },
              getObject: (key: string) =>
                Promise.resolve({
                  Body: Readable.from([objects.get(key)!]),
                }),
              deleteObject: (key: string) => {
                objects.delete(key);
                return Promise.resolve();
              },
            } as never,
          );
          const bytes = Buffer.from('provider attachment content');
          const {
            created: [uploaded],
          } = await service.uploadForProvider({
            actorUserId: providerUserId,
            requestId: request.id,
            files: [
              {
                originalname: 'Дополнительный документ.docx',
                mimetype:
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                buffer: bytes,
                size: bytes.length,
              } as Express.Multer.File,
            ],
          });
          const customer = { actorUserId: customerId, requestId: request.id };
          const photoBytes = await sharp({
            create: { width: 2, height: 2, channels: 3, background: '#507050' },
          })
            .webp()
            .toBuffer();
          const requestedPhoto = await tx.requestDocumentRequest.create({
            data: { requestId: request.id, providerId, title: 'Фото участка' },
          });
          const customerUploads = new RequestDocumentRequestsService(
            {
              request: tx.request,
              requestDocumentRequest: tx.requestDocumentRequest,
              $transaction: (
                run: (transaction: typeof tx) => Promise<unknown>,
              ) => run(tx),
            } as never,
            {
              getServiceManagementContext: () =>
                Promise.resolve({ isPlatformAdmin: false, providerId }),
            } as never,
            {
              putObject: ({ Key, Body }: { Key: string; Body: Buffer }) => {
                objects.set(Key, Body);
                return Promise.resolve();
              },
              getObject: (key: string) =>
                Promise.resolve({ Body: Readable.from([objects.get(key)!]) }),
            } as never,
          );
          await customerUploads.uploadForCustomer({
            actorUserId: customerId,
            requestId: request.id,
            docRequestId: requestedPhoto.id,
            file: {
              originalname: 'Фото клиента.webp',
              mimetype: 'image/webp',
              buffer: photoBytes,
              size: photoBytes.length,
            } as Express.Multer.File,
          });
          expect(
            await tx.requestDocumentRequest.findUnique({
              where: { id: requestedPhoto.id },
            }),
          ).toMatchObject({
            originalName: 'Фото клиента.webp',
            mimeType: 'image/webp',
            sizeBytes: photoBytes.length,
            storageRelPath: expect.stringMatching(/\.webp$/),
          });
          const customerPhotoDownload =
            await customerUploads.getDownloadStreamForProvider({
              actorUserId: providerUserId,
              docRequestId: requestedPhoto.id,
              inline: false,
            });
          expect(customerPhotoDownload.mimeType).toBe('image/webp');
          const photoChunks: Buffer[] = [];
          for await (const chunk of customerPhotoDownload.stream as Readable)
            photoChunks.push(Buffer.from(chunk as Uint8Array));
          expect(Buffer.concat(photoChunks)).toEqual(photoBytes);
          const {
            created: [hidden],
          } = await service.uploadForProvider({
            actorUserId: providerUserId,
            requestId: request.id,
            visibleToCustomer: false,
            files: [
              {
                originalname: 'Только для исполнителя.webp',
                mimetype: 'image/webp',
                buffer: photoBytes,
                size: photoBytes.length,
              } as Express.Multer.File,
            ],
          });
          const providerFiles = await service.listMiscForProvider({
            actorUserId: providerUserId,
            requestId: request.id,
          });
          expect(providerFiles).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                id: uploaded.id,
                visibleToCustomer: true,
              }),
              expect.objectContaining({
                id: hidden.id,
                visibleToCustomer: false,
              }),
            ]),
          );
          const privateDownload = await service.getDownloadStreamForProvider({
            actorUserId: providerUserId,
            fileId: hidden.id,
            inline: false,
          });
          expect(privateDownload.fileName).toBe('Только для исполнителя.webp');
          expect(privateDownload.mimeType).toBe('image/webp');
          expect(
            await tx.requestContractFile.findUnique({
              where: { id: hidden.id },
            }),
          ).toMatchObject({
            originalName: 'Только для исполнителя.webp',
            mimeType: 'image/webp',
            sizeBytes: photoBytes.length,
            storageRelPath: expect.stringMatching(/\.webp$/),
          });
          (privateDownload.stream as Readable).destroy();
          for (const inline of [false, true]) {
            await expect(
              service.getDownloadStreamForCustomer({
                ...customer,
                fileId: hidden.id,
                inline,
              }),
            ).rejects.toBeInstanceOf(NotFoundException);
          }
          const files = await service.listMiscForCustomer(customer);
          expect(files.map((file) => file.id)).toEqual([uploaded.id]);
          expect(files[0].originalName).toBe('Дополнительный документ.docx');
          expect(files[0]).not.toHaveProperty('storageRelPath');
          expect(
            (await service.listForCustomer(customer)).map((file) => file.id),
          ).toEqual([contract.id]);

          const download = await service.getDownloadStreamForCustomer({
            ...customer,
            fileId: uploaded.id,
            inline: false,
          });
          const chunks: Buffer[] = [];
          for await (const chunk of download.stream as Readable)
            chunks.push(Buffer.from(chunk as Uint8Array));
          expect(Buffer.concat(chunks)).toEqual(bytes);
          expect(download.fileName).toBe('Дополнительный документ.docx');
          expect(download.disposition).toBe('attachment');

          const visibilityInput = {
            actorUserId: providerUserId,
            requestId: request.id,
            fileId: uploaded.id,
          };
          await service.setMiscVisibilityForProvider({
            ...visibilityInput,
            visibleToCustomer: false,
          });
          expect(await service.listMiscForCustomer(customer)).toEqual([]);
          for (const inline of [false, true]) {
            await expect(
              service.getDownloadStreamForCustomer({
                ...customer,
                fileId: uploaded.id,
                inline,
              }),
            ).rejects.toBeInstanceOf(NotFoundException);
          }
          expect(
            await tx.requestContractFile.findUnique({
              where: { id: uploaded.id },
            }),
          ).toMatchObject({ visibleToCustomer: false });
          await service.setMiscVisibilityForProvider({
            ...visibilityInput,
            visibleToCustomer: true,
          });
          expect(
            (await service.listMiscForCustomer(customer)).map(
              (file) => file.id,
            ),
          ).toEqual([uploaded.id]);
          const restored = await service.getDownloadStreamForCustomer({
            ...customer,
            fileId: uploaded.id,
            inline: false,
          });
          (restored.stream as Readable).destroy();
          for (const fileId of [
            contract.id,
            oldFile.id,
            otherFile.id,
            randomUUID(),
          ]) {
            await expect(
              service.setMiscVisibilityForProvider({
                ...visibilityInput,
                fileId,
                visibleToCustomer: false,
              }),
            ).rejects.toBeInstanceOf(NotFoundException);
          }
          await tx.request.update({
            where: { id: request.id },
            data: { providerId: oldProviderId },
          });
          await expect(
            service.setMiscVisibilityForProvider({
              ...visibilityInput,
              visibleToCustomer: false,
            }),
          ).rejects.toBeInstanceOf(ForbiddenException);
          expect(
            await tx.requestContractFile.findUnique({
              where: { id: uploaded.id },
            }),
          ).toMatchObject({ visibleToCustomer: true });
          await tx.request.update({
            where: { id: request.id },
            data: { providerId },
          });

          await expect(
            service.listMiscForCustomer({
              ...customer,
              actorUserId: otherCustomerId,
            }),
          ).rejects.toBeInstanceOf(NotFoundException);
          for (const fileId of [oldFile.id, otherFile.id]) {
            await expect(
              service.getDownloadStreamForCustomer({
                ...customer,
                fileId,
                inline: false,
              }),
            ).rejects.toBeInstanceOf(NotFoundException);
          }
          await expect(
            service.getDownloadStreamForCustomer({
              ...customer,
              actorUserId: otherCustomerId,
              fileId: uploaded.id,
              inline: false,
            }),
          ).rejects.toBeInstanceOf(NotFoundException);
          await tx.request.update({
            where: { id: request.id },
            data: { lockedAt: null },
          });
          expect(await service.listMiscForCustomer(customer)).toEqual([]);
          await expect(
            service.getDownloadStreamForCustomer({
              ...customer,
              fileId: uploaded.id,
              inline: false,
            }),
          ).rejects.toBeInstanceOf(ForbiddenException);

          await tx.request.update({
            where: { id: request.id },
            data: { lockedAt: new Date() },
          });
          await service.deleteForProvider({
            actorUserId: providerUserId,
            fileId: uploaded.id,
          });
          expect(await service.listMiscForCustomer(customer)).toEqual([]);
          throw rollback;
        },
        { timeout: 15000 },
      ),
    ).rejects.toBe(rollback);
  });
});
