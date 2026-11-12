import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from './requests.service';

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)(
  'request numbers through the application service',
  () => {
    let prisma: PrismaClient;
    beforeAll(() => {
      prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: databaseUrl! }),
      });
    });
    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('returns stable service numbers and numbers free/category requests only after accepting a valid contract', async () => {
      const rollback = new Error('rollback numbering fixtures');
      await expect(
        prisma.$transaction(
          async (tx) => {
            const [counter] = await tx.$queryRaw<Array<{ lastNumber: number }>>`
        SELECT "lastNumber" FROM "RequestNumberCounter" WHERE "id" = 1 FOR UPDATE
      `;
            const customer = await tx.user.create({
              data: {
                email: `number-customer-${randomUUID()}@example.com`,
                accountKind: 'CUSTOMER',
                systemRole: 'CUSTOMER',
              },
            });
            const provider = await tx.provider.create({
              data: {
                name: 'Numbering test',
                slug: `numbering-${randomUUID()}`,
                type: 'COMPANY',
              },
            });
            const category = await tx.serviceCategory.create({
              data: {
                name: 'Numbering test',
                shortName: 'Numbering',
                slug: `numbering-${randomUUID()}`,
              },
            });
            const published = await tx.service.create({
              data: {
                providerId: provider.id,
                categoryId: category.id,
                title: 'Numbering test',
                price: '15000',
                status: 'PUBLISHED',
              },
            });
            const service = new RequestsService(
              {
                user: tx.user,
                service: tx.service,
                serviceCategory: tx.serviceCategory,
                request: tx.request,
                $transaction: (run: (client: typeof tx) => Promise<unknown>) =>
                  run(tx),
              } as unknown as PrismaService,
              {} as never,
              {} as never,
              {
                assertCurrentVersions: vi
                  .fn()
                  .mockResolvedValue({ terms: 'numbering-test' }),
              } as never,
              {
                notifyFreeRequestCreated: vi.fn(),
              } as never,
            );

            const input = {
              message: 'Numbering test',
              operationId: randomUUID(),
            };
            const direct = await service.createForService(
              published.id,
              customer.id,
              input,
            );
            expect(direct.number).toBe(counter.lastNumber + 1);
            const replayed = await service.createForService(
              published.id,
              customer.id,
              input,
            );
            expect(replayed.id).toBe(direct.id);
            expect(replayed.number).toBe(direct.number);

            const free = await service.createUnlinked(customer.id, {
              message: 'Free request',
            });
            const categorized = await service.createForCategory(
              category.id,
              customer.id,
              {},
            );
            expect(free.number).toBeNull();
            expect(categorized.number).toBeNull();

            for (const request of [direct, free, categorized]) {
              await tx.request.update({
                where: { id: request.id },
                data: {
                  providerId: provider.id,
                  lockedAt: new Date(),
                  totalAmountRubles: 15000,
                },
              });
              if (request.id === direct.id) {
                await tx.requestPriceProposal.updateMany({
                  where: { requestId: request.id },
                  data: { acceptedAt: new Date() },
                });
              } else {
                await tx.requestPriceProposal.create({
                  data: {
                    requestId: request.id,
                    providerId: provider.id,
                    amountRubles: 15000,
                    authorSide: 'PROVIDER',
                    acceptedAt: new Date(),
                  },
                });
              }
            }

            await expect(
              service.acceptContractByCustomer(customer.id, free.id, {
                termsVersion: 'numbering-test',
              }),
            ).rejects.toThrow(
              'At least one approved contract bundle is required',
            );
            expect(
              (await tx.request.findUniqueOrThrow({ where: { id: free.id } }))
                .number,
            ).toBeNull();

            for (const request of [direct, free, categorized]) {
              await tx.requestContractFile.create({
                data: {
                  requestId: request.id,
                  providerId: provider.id,
                  role: 'CONTRACT_DOCUMENT',
                  bundleId: randomUUID(),
                  status: 'APPROVED',
                  originalName: 'numbering-test.pdf',
                  mimeType: 'application/pdf',
                  sizeBytes: 1,
                  sha256: 'numbering-test',
                  storageRelPath: 'test/numbering-unused',
                },
              });
            }

            const accepted = await service.acceptContractByCustomer(
              customer.id,
              free.id,
              { termsVersion: 'numbering-test' },
            );
            const acceptedCategory = await service.acceptContractByCustomer(
              customer.id,
              categorized.id,
              { termsVersion: 'numbering-test' },
            );
            const acceptedDirect = await service.acceptContractByCustomer(
              customer.id,
              direct.id,
              { termsVersion: 'numbering-test' },
            );
            expect(accepted.number).toBe(counter.lastNumber + 2);
            expect(acceptedCategory.number).toBe(counter.lastNumber + 3);
            expect(acceptedDirect.number).toBe(direct.number);
            await expect(
              service.acceptContractByCustomer(customer.id, free.id, {
                termsVersion: 'numbering-test',
              }),
            ).rejects.toThrow('Request is not editable');
            const current = await tx.requestNumberCounter.findUniqueOrThrow({
              where: { id: 1 },
            });
            expect(current.lastNumber).toBe(counter.lastNumber + 3);
            throw rollback;
          },
          { maxWait: 15_000, timeout: 30_000 },
        ),
      ).rejects.toBe(rollback);
    });
  },
);
