import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RequestsService } from './requests.service';

function makeService(prisma: any) {
  const auth = {} as any;
  const internalAuth = {} as any;
  return new RequestsService(prisma, auth, internalAuth);
}

describe('RequestsService acceptContractByCustomer', () => {
  it('blocks contract acceptance until all requested documents are uploaded', async () => {
    const tx = {
      request: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'PROVIDER_SELECTED',
          providerId: 'p1',
          customerUserId: 'u1',
          dealTerms: {},
          serviceId: null,
          categoryId: null,
        }),
        update: vi.fn(),
      },
      requestContractFile: {
        count: vi.fn().mockResolvedValue(1),
      },
      requestDocumentRequest: {
        count: vi.fn().mockResolvedValue(2),
      },
      requestEvent: { create: vi.fn() },
    };

    const prisma = {
      $transaction: async (fn: any) => await fn(tx),
    };

    const svc = makeService(prisma);
    await expect(
      svc.acceptContractByCustomer('u1', 'r1', { offerVersion: '2026-04-19' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

