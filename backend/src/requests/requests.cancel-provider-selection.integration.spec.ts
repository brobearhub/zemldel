import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { RequestsService } from './requests.service';

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('customer cancels provider selection', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl! }),
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('revokes the deal price and approved contract before allowing a new choice', async () => {
    const requestId = randomUUID();
    const providerId = randomUUID();
    const userId = randomUUID();
    const proposalId = randomUUID();
    const contractFileId = randomUUID();
    try {
      await prisma.user.create({
        data: { id: userId, email: `cancel-${userId}@example.com` },
      });
      await prisma.provider.create({
        data: {
          id: providerId,
          name: 'Cancellation test provider',
          slug: `cancel-${providerId}`,
          type: 'COMPANY',
        },
      });
      await prisma.request.create({
        data: {
          id: requestId,
          customerUserId: userId,
          providerId,
          status: 'DISCUSSING',
          lockedAt: new Date(),
          totalAmountRubles: 12000,
        },
      });
      await prisma.requestProviderOffer.create({
        data: {
          requestId,
          providerId,
          status: 'SELECTED',
          selectedAt: new Date(),
        },
      });
      await prisma.requestPriceProposal.create({
        data: {
          id: proposalId,
          requestId,
          providerId,
          amountRubles: 12000,
          authorSide: 'PROVIDER',
          acceptedAt: new Date(),
        },
      });
      await prisma.requestContractFile.create({
        data: {
          id: contractFileId,
          requestId,
          providerId,
          status: 'APPROVED',
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1,
          sha256: 'test',
          storageRelPath: 'test/unused',
        },
      });

      const service = new RequestsService(
        prisma as never,
        {} as never,
        {} as never,
        {} as never,
        { notifyMessageCreated: vi.fn() } as never,
      );
      await service.cancelProviderSelectionByCustomer(userId, requestId, {
        reason: 'Условия изменились',
      });

      const cancelled = await prisma.request.findUniqueOrThrow({
        where: { id: requestId },
      });
      const offer = await prisma.requestProviderOffer.findUniqueOrThrow({
        where: { requestId_providerId: { requestId, providerId } },
      });
      const proposal = await prisma.requestPriceProposal.findUniqueOrThrow({
        where: { id: proposalId },
      });
      const contract = await prisma.requestContractFile.findUniqueOrThrow({
        where: { id: contractFileId },
      });
      expect(cancelled.providerId).toBeNull();
      expect(cancelled.lockedAt).toBeNull();
      expect(cancelled.totalAmountRubles).toBeNull();
      expect(offer.status).toBe('CANCELLED_BY_CUSTOMER');
      expect(proposal.supersededAt).not.toBeNull();
      expect(contract.status).toBe('REVISION_REQUESTED');

      await service.selectProviderByCustomer(userId, requestId, { providerId });
      const selectedAgain = await prisma.request.findUniqueOrThrow({
        where: { id: requestId },
      });
      expect(selectedAgain.providerId).toBe(providerId);
      expect(selectedAgain.totalAmountRubles).toBeNull();
    } finally {
      await prisma.request.deleteMany({ where: { id: requestId } });
      await prisma.provider.deleteMany({ where: { id: providerId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });
});
