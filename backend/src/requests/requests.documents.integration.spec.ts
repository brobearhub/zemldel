import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RequestsService } from './requests.service';

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('customer documents query', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl! }),
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('finds documents of the selected provider without including empty or inaccessible requests', async () => {
    const rollback = new Error('rollback test data');
    await expect(
      prisma.$transaction(async (tx) => {
        const userId = randomUUID();
        const otherUserId = randomUUID();
        const providerId = randomUUID();
        const oldProviderId = randomUUID();
        await tx.user.createMany({
          data: [
            { id: userId, email: `documents-${userId}@example.com` },
            { id: otherUserId, email: `documents-${otherUserId}@example.com` },
          ],
        });
        await tx.provider.createMany({
          data: [
            {
              id: providerId,
              name: 'Documents test',
              slug: `documents-${providerId}`,
              type: 'COMPANY',
            },
            {
              id: oldProviderId,
              name: 'Previous provider',
              slug: `documents-${oldProviderId}`,
              type: 'COMPANY',
            },
          ],
        });

        const ids = Object.fromEntries(
          [
            'empty',
            'contract',
            'requested',
            'file',
            'slot',
            'otherProvider',
            'unlocked',
            'draft',
            'unreadable',
            'pendingRequest',
            'pendingSlot',
            'otherCustomer',
          ].map((key) => [key, randomUUID()]),
        );
        await tx.request.createMany({
          data: Object.entries(ids).map(([key, id]) => ({
            id,
            customerUserId: key === 'otherCustomer' ? otherUserId : userId,
            providerId,
            lockedAt: key === 'unlocked' ? null : new Date(),
            status: key === 'unreadable' ? 'DISCUSSING' : 'ACTIVE',
          })),
        });
        const file = {
          originalName: 'document.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1,
          sha256: 'test',
          storageRelPath: 'test/unused',
        };
        await tx.requestContractFile.createMany({
          data: [
            { ...file, requestId: ids.contract, providerId },
            {
              ...file,
              requestId: ids.otherProvider,
              providerId: oldProviderId,
            },
            { ...file, requestId: ids.unlocked, providerId },
            { ...file, requestId: ids.otherCustomer, providerId },
          ],
        });
        await tx.requestDocumentRequest.createMany({
          data: [ids.requested, ids.contract].map((requestId) => ({
            requestId,
            providerId,
            title: 'Запрошенный документ',
            status: 'UPLOADED',
            ...file,
          })),
        });
        await tx.requestDocumentRequest.create({
          data: {
            requestId: ids.pendingRequest,
            providerId,
            title: 'Документ ещё не загружен',
          },
        });
        const stages = await Promise.all(
          ['file', 'slot', 'draft', 'unreadable', 'pendingSlot'].map((key) =>
            tx.requestWorkStage.create({
              data: {
                requestId: ids[key],
                providerId,
                title: 'Этап',
                statusKey: 'new',
                statusLabel: 'Новый',
                lifecycle: key === 'draft' ? 'DRAFT' : 'PUBLISHED',
              },
            }),
          ),
        );
        await tx.requestWorkStageFile.createMany({
          data: [
            { ...file, stageId: stages[0].id },
            { ...file, stageId: stages[2].id },
            { ...file, stageId: stages[3].id },
          ],
        });
        await tx.requestWorkStageDocSlot.create({
          data: {
            stageId: stages[1].id,
            title: 'Запрошенный файл этапа',
            status: 'UPLOADED',
            ...file,
          },
        });
        await tx.requestWorkStageDocSlot.create({
          data: {
            stageId: stages[4].id,
            title: 'Файл этапа ещё не загружен',
          },
        });

        const service = new RequestsService(
          tx as never,
          {} as never,
          {} as never,
          {} as never,
          {} as never,
        );
        expect(await service.listMineWithDocuments(userId)).toEqual(
          expect.arrayContaining([
            ids.contract,
            ids.requested,
            ids.file,
            ids.slot,
          ]),
        );
        expect(await service.listMineWithDocuments(userId)).toHaveLength(4);
        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });
});
