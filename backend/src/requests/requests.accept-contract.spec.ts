import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RequestsService } from './requests.service';

function makeService(prisma: unknown, legalDocs?: { assertCurrentVersions: ReturnType<typeof vi.fn> }) {
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
  it('blocks contract acceptance until all requested documents are uploaded', async () => {
    const tx = {
      request: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'DISCUSSING',
          providerId: 'p1',
          lockedAt: new Date('2026-08-06T00:00:00.000Z'),
          customerUserId: 'u1',
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
        findUnique: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'DISCUSSING',
          providerId: 'p1',
          lockedAt: new Date('2026-08-06T00:00:00.000Z'),
          customerUserId: 'u1',
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
    ).rejects.toMatchObject({ message: 'All contract bundles must be approved' });
  });

  it('acceptContract rejects when provider not locked', async () => {
    const tx = {
      request: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'DISCUSSING',
          providerId: 'p1',
          lockedAt: null,
          customerUserId: 'u1',
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
