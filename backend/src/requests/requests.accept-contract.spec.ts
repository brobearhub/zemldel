import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RequestsService } from './requests.service';

function makeService(
  prisma: unknown,
  legalDocs?: { assertCurrentVersions: ReturnType<typeof vi.fn> },
) {
  const auth = {} as never;
  const internalAuth = {} as never;
  const docs = legalDocs ?? {
    assertCurrentVersions: vi.fn().mockResolvedValue({ terms: '2026-08-04' }),
  };
  const chat = { notifyMessageCreated: vi.fn() } as never;
  return new RequestsService(
    prisma as never,
    auth,
    internalAuth,
    docs as never,
    chat,
  );
}

describe('RequestsService acceptContractByCustomer', () => {
  it('blocks a legacy total without an active accepted provider proposal', async () => {
    const now = new Date('2026-08-06T00:00:00.000Z');
    const current = {
      id: 'r1',
      status: 'DISCUSSING',
      providerId: 'p1',
      lockedAt: now,
      customerUserId: 'u1',
      totalAmountRubles: 12000,
      serviceId: null,
      categoryId: null,
      requestCityId: null,
      message: null,
      location: null,
      createdAt: now,
      updatedAt: now,
      providerOffers: [],
      payments: [],
      priceProposals: [],
    };
    const tx = {
      request: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue(current),
        update: vi.fn().mockResolvedValue({ ...current, status: 'ACTIVE' }),
      },
      requestPriceProposal: { findFirst: vi.fn().mockResolvedValue(null) },
      requestContractFile: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ bundleId: 'b1', status: 'APPROVED' }])
          .mockResolvedValueOnce([{ bundleId: 'b1' }]),
      },
      requestDocumentRequest: { count: vi.fn().mockResolvedValue(0) },
      legalAcceptance: { create: vi.fn().mockResolvedValue({ id: 'a1' }) },
      requestEvent: { create: vi.fn().mockResolvedValue({ id: 'e1' }) },
    };
    const prisma = {
      $transaction: async (fn: (client: typeof tx) => Promise<unknown>) =>
        await fn(tx),
    };

    await expect(
      makeService(prisma).acceptContractByCustomer('u1', 'r1', {
        termsVersion: '2026-08-04',
      }),
    ).rejects.toMatchObject({
      message: 'Price must be agreed before contract acceptance',
    });
  });

  it('blocks contract acceptance without an agreed price', async () => {
    const tx = {
      request: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'DISCUSSING',
          providerId: 'p1',
          lockedAt: new Date('2026-08-06T00:00:00.000Z'),
          customerUserId: 'u1',
          totalAmountRubles: null,
          serviceId: null,
          categoryId: null,
        }),
        update: vi.fn(),
      },
      requestContractFile: { findMany: vi.fn() },
      requestDocumentRequest: { count: vi.fn() },
      legalAcceptance: { create: vi.fn() },
      requestEvent: { create: vi.fn() },
    };
    const prisma = {
      $transaction: async (fn: (client: typeof tx) => Promise<unknown>) =>
        await fn(tx),
    };

    await expect(
      makeService(prisma).acceptContractByCustomer('u1', 'r1', {
        termsVersion: '2026-08-04',
      }),
    ).rejects.toMatchObject({
      message: 'Price must be agreed before contract acceptance',
    });
    expect(tx.requestContractFile.findMany).not.toHaveBeenCalled();
  });

  it('blocks contract acceptance until all requested documents are uploaded', async () => {
    const tx = {
      request: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'DISCUSSING',
          providerId: 'p1',
          lockedAt: new Date('2026-08-06T00:00:00.000Z'),
          customerUserId: 'u1',
          totalAmountRubles: 12000,
          dealTerms: {},
          serviceId: null,
          categoryId: null,
        }),
        update: vi.fn(),
      },
      requestContractFile: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ bundleId: 'b1' }])
          .mockResolvedValueOnce([{ bundleId: 'b1' }]),
      },
      requestDocumentRequest: {
        count: vi.fn().mockResolvedValue(2),
      },
      requestPriceProposal: {
        findFirst: vi.fn().mockResolvedValue({ id: 'pp1' }),
      },
      legalAcceptance: { create: vi.fn() },
      requestEvent: { create: vi.fn() },
    };

    const prisma = {
      $transaction: async (fn: (client: typeof tx) => Promise<unknown>) =>
        await fn(tx),
    };

    const svc = makeService(prisma);
    await expect(
      svc.acceptContractByCustomer('u1', 'r1', { termsVersion: '2026-08-04' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks contract acceptance until all contract bundles are approved', async () => {
    const tx = {
      request: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'DISCUSSING',
          providerId: 'p1',
          lockedAt: new Date('2026-08-06T00:00:00.000Z'),
          customerUserId: 'u1',
          totalAmountRubles: 12000,
          dealTerms: {},
          serviceId: null,
          categoryId: null,
        }),
        update: vi.fn(),
      },
      requestContractFile: {
        findMany: vi.fn().mockResolvedValueOnce([
          { bundleId: 'b1', status: 'APPROVED' },
          { bundleId: 'b2', status: 'PENDING_CUSTOMER' },
        ]),
      },
      requestDocumentRequest: {
        count: vi.fn(),
      },
      requestPriceProposal: {
        findFirst: vi.fn().mockResolvedValue({ id: 'pp1' }),
      },
      legalAcceptance: { create: vi.fn() },
      requestEvent: { create: vi.fn() },
    };

    const prisma = {
      $transaction: async (fn: (client: typeof tx) => Promise<unknown>) =>
        await fn(tx),
    };

    const svc = makeService(prisma);
    await expect(
      svc.acceptContractByCustomer('u1', 'r1', { termsVersion: '2026-08-04' }),
    ).rejects.toMatchObject({
      message:
        'Не все пакеты договора одобрены. Одобрите актуальные пакеты или дождитесь, пока исполнитель заменит пакет, отправленный на доработку.',
    });
  });

  it('acceptContract rejects when provider not locked', async () => {
    const tx = {
      request: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'DISCUSSING',
          providerId: 'p1',
          lockedAt: null,
          customerUserId: 'u1',
          totalAmountRubles: 12000,
          dealTerms: {},
          serviceId: null,
          categoryId: null,
        }),
        update: vi.fn(),
      },
      requestContractFile: { findMany: vi.fn() },
      requestDocumentRequest: { count: vi.fn() },
      legalAcceptance: { create: vi.fn() },
      requestEvent: { create: vi.fn() },
    };

    const prisma = {
      $transaction: async (fn: (client: typeof tx) => Promise<unknown>) =>
        await fn(tx),
    };

    const svc = makeService(prisma);
    await expect(
      svc.acceptContractByCustomer('u1', 'r1', { termsVersion: '2026-08-04' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
