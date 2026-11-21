import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RequestsService } from './requests.service';

vi.mock('../provider-clients/provider-client-record', () => ({
  clientForAcceptedContract: vi
    .fn()
    .mockResolvedValue({ clientId: 'client-1', changedRequestIds: [] }),
}));

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
  it.each([
    {
      scenario: 'changed after the form opened',
      expected: 20000,
      actual: 25000,
      result: 'changed',
    },
    {
      scenario: 'same price',
      expected: 25000,
      actual: 25000,
      result: 'accepted',
    },
    {
      scenario: 'zero is compared rather than skipped',
      expected: 0,
      actual: 25000,
      result: 'changed',
    },
    {
      scenario: 'zero matches zero',
      expected: 0,
      actual: 0,
      result: 'accepted',
    },
    {
      scenario: 'no price shown but one was set',
      expected: null,
      actual: 25000,
      result: 'changed',
    },
    {
      scenario: 'price still absent',
      expected: null,
      actual: null,
      result: 'missing',
    },
    {
      scenario: 'legacy client omits the field',
      expected: undefined,
      actual: 25000,
      result: 'accepted',
    },
  ] as const)(
    'checks the price after the row lock: $scenario',
    async ({ expected, actual, result }) => {
      const now = new Date('2026-11-16T00:00:00Z');
      let storedPrice: number | null = 20000;
      const current = {
        id: 'r1',
        status: 'DISCUSSING',
        providerId: 'p1',
        lockedAt: now,
        customerUserId: 'u1',
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
          updateMany: vi.fn().mockImplementation(() => {
            storedPrice = actual;
            return { count: 1 };
          }),
          findUnique: vi.fn().mockImplementation(() => ({
            ...current,
            totalAmountRubles: storedPrice,
          })),
          update: vi.fn().mockImplementation(() => ({
            ...current,
            totalAmountRubles: storedPrice,
            status: 'ACTIVE',
            contractAcceptedAt: now,
          })),
        },
        requestPriceProposal: {
          findFirst: vi.fn().mockResolvedValue({ id: 'p1-price' }),
        },
        requestContractFile: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ bundleId: 'b1', status: 'APPROVED' }]),
        },
        requestDocumentRequest: { count: vi.fn().mockResolvedValue(0) },
        legalAcceptance: { create: vi.fn() },
        requestEvent: { create: vi.fn() },
      };
      const service = makeService({
        $transaction: (run: (client: typeof tx) => Promise<unknown>) => run(tx),
      });
      const action = service.acceptContractByCustomer('u1', 'r1', {
        termsVersion: '2026-08-04',
        ...(expected !== undefined
          ? { expectedTotalAmountRubles: expected }
          : {}),
      });
      if (result === 'changed') {
        await expect(action).rejects.toMatchObject({
          status: 409,
          response: {
            error: 'PRICE_CHANGED',
            message:
              'Цена работ изменилась. Проверьте новую сумму и подтвердите договор повторно.',
          },
        });
        expect(tx.request.update).not.toHaveBeenCalled();
        expect(tx.requestPriceProposal.findFirst).not.toHaveBeenCalled();
        expect(tx.legalAcceptance.create).not.toHaveBeenCalled();
        expect(tx.requestEvent.create).not.toHaveBeenCalled();
      } else if (result === 'missing') {
        await expect(action).rejects.toThrow(
          'Price must be agreed before contract acceptance',
        );
        expect(tx.request.update).not.toHaveBeenCalled();
      } else {
        await expect(action).resolves.toMatchObject({
          status: 'ACTIVE',
          totalAmountRubles: actual,
        });
        expect(tx.request.update).toHaveBeenCalledOnce();
      }
      expect(tx.request.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
        tx.request.findUnique.mock.invocationCallOrder[0],
      );
    },
  );

  it('uses a previously accepted stored price when a newer pending proposal was never accepted', async () => {
    const now = new Date('2026-11-16T00:00:00Z');
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
      priceProposals: [
        {
          id: 'pending',
          providerId: 'p1',
          amountRubles: 15000,
          authorSide: 'PROVIDER',
          acceptedAt: null,
          isDirectSet: false,
          createdAt: now,
        },
      ],
    };
    const previous = {
      id: 'accepted',
      providerId: 'p1',
      amountRubles: 12000,
      acceptedAt: now,
      isDirectSet: false,
      supersededAt: now,
    };
    const pending = {
      id: 'pending',
      providerId: 'p1',
      amountRubles: 15000,
      acceptedAt: null,
      isDirectSet: false,
      supersededAt: null,
    };
    const tx = {
      request: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue(current),
        update: vi.fn().mockResolvedValue({
          ...current,
          status: 'ACTIVE',
          contractAcceptedAt: now,
        }),
      },
      requestPriceProposal: {
        findFirst: vi.fn(({ where }) =>
          Promise.resolve(
            [previous, pending].find(
              (price) =>
                price.providerId === where.providerId &&
                price.amountRubles === where.amountRubles &&
                where.OR.some(
                  (clause: {
                    acceptedAt?: { not: null };
                    isDirectSet?: boolean;
                    supersededAt?: null;
                  }) =>
                    (clause.acceptedAt?.not === null &&
                      price.acceptedAt != null) ||
                    (clause.isDirectSet === true &&
                      price.isDirectSet &&
                      price.supersededAt === null),
                ),
            ) ?? null,
          ),
        ),
      },
      requestContractFile: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ bundleId: 'b1', status: 'APPROVED' }]),
      },
      requestDocumentRequest: { count: vi.fn().mockResolvedValue(0) },
      legalAcceptance: { create: vi.fn() },
      requestEvent: { create: vi.fn() },
    };
    const service = makeService({
      $transaction: (run: (client: typeof tx) => Promise<unknown>) => run(tx),
    });
    const dto = await service.acceptContractByCustomer('u1', 'r1', {
      termsVersion: '2026-08-04',
      expectedTotalAmountRubles: 12000,
    });
    expect(dto).toMatchObject({ status: 'ACTIVE', totalAmountRubles: 12000 });
    expect(tx.requestPriceProposal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          providerId: 'p1',
          amountRubles: 12000,
        }),
      }),
    );
  });

  it.each([
    {
      mode: 'directly set',
      isDirectSet: true,
      acceptedAt: null,
      permitted: true,
    },
    {
      mode: 'previously accepted',
      isDirectSet: false,
      acceptedAt: new Date('2026-08-05T00:00:00Z'),
      permitted: true,
    },
    {
      mode: 'legacy pending',
      isDirectSet: false,
      acceptedAt: null,
      permitted: false,
    },
  ])(
    'requires an effective price, including $mode',
    async ({ isDirectSet, acceptedAt, permitted }) => {
      const now = new Date('2026-11-02T00:00:00Z');
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
          update: vi.fn().mockResolvedValue({
            ...current,
            status: 'ACTIVE',
            contractAcceptedAt: now,
          }),
        },
        requestPriceProposal: {
          findFirst: vi.fn(({ where }) => {
            const matches =
              where.providerId === 'p1' &&
              where.amountRubles === 12000 &&
              where.OR.some(
                (clause: {
                  acceptedAt?: { not: null };
                  isDirectSet?: boolean;
                }) =>
                  (clause.isDirectSet === true && isDirectSet) ||
                  (clause.acceptedAt?.not === null && acceptedAt != null),
              );
            return Promise.resolve(matches ? { id: 'price-1' } : null);
          }),
        },
        requestContractFile: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ bundleId: 'b1', status: 'APPROVED' }]),
        },
        requestDocumentRequest: { count: vi.fn().mockResolvedValue(0) },
        legalAcceptance: { create: vi.fn().mockResolvedValue({ id: 'a1' }) },
        requestEvent: { create: vi.fn().mockResolvedValue({ id: 'e1' }) },
      };
      const prisma = {
        $transaction: (run: (client: typeof tx) => Promise<unknown>) => run(tx),
      };
      const action = makeService(prisma).acceptContractByCustomer('u1', 'r1', {
        termsVersion: '2026-08-04',
      });
      if (permitted) {
        await expect(action).resolves.toMatchObject({ status: 'ACTIVE' });
      } else {
        await expect(action).rejects.toThrow(
          'Price must be agreed before contract acceptance',
        );
        expect(tx.request.update).not.toHaveBeenCalled();
      }
      expect(tx.requestPriceProposal.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            requestId: 'r1',
            providerId: 'p1',
            amountRubles: 12000,
            OR: [
              { acceptedAt: { not: null } },
              { isDirectSet: true, supersededAt: null },
            ],
          }),
        }),
      );
    },
  );

  it.each([
    ['SERVICE', false],
    ['SERVICE', true],
    ['FREEFORM', false],
    ['FREEFORM', true],
  ] as const)(
    'accepts an approved %s document, signature attached: %s',
    async (subject, hasSignature) => {
      const now = new Date('2026-11-02T00:00:00.000Z');
      const current = {
        id: 'r1',
        status: 'DISCUSSING',
        providerId: 'p1',
        lockedAt: now,
        customerUserId: 'u1',
        totalAmountRubles: 12000,
        serviceId: subject === 'SERVICE' ? 's1' : null,
        categoryId: null,
        requestCityId: null,
        message: 'Test request',
        location: null,
        createdAt: now,
        updatedAt: now,
        providerOffers: [],
        payments: [],
        priceProposals: [],
      };
      const document = { bundleId: 'b1', status: 'APPROVED' };
      const findMany = vi.fn(({ where }: { where: { role: string } }) =>
        Promise.resolve(
          where.role === 'CONTRACT_DOCUMENT'
            ? [document]
            : hasSignature
              ? [{ bundleId: 'b1' }]
              : [],
        ),
      );
      const tx = {
        request: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUnique: vi.fn().mockResolvedValue(current),
          update: vi.fn().mockResolvedValue({
            ...current,
            number: 12,
            status: 'ACTIVE',
            contractAcceptedAt: now,
          }),
        },
        requestPriceProposal: {
          findFirst: vi.fn().mockResolvedValue({ id: 'pp1' }),
        },
        requestContractFile: { findMany },
        requestDocumentRequest: { count: vi.fn().mockResolvedValue(0) },
        legalAcceptance: { create: vi.fn().mockResolvedValue({ id: 'a1' }) },
        requestEvent: { create: vi.fn().mockResolvedValue({ id: 'e1' }) },
      };
      const prisma = {
        $transaction: async (run: (client: typeof tx) => Promise<unknown>) =>
          run(tx),
      };
      const result = await makeService(prisma).acceptContractByCustomer(
        'u1',
        'r1',
        { termsVersion: '2026-08-04' },
      );
      expect(result.status).toBe('ACTIVE');
      expect(result.number).toBe(12);
      expect(tx.legalAcceptance.create).toHaveBeenCalledOnce();
      expect(findMany).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'CONTRACT_SIGNATURE' }),
        }),
      );
    },
  );

  it('still requires a contract document', async () => {
    const current = {
      id: 'r1',
      customerUserId: 'u1',
      providerId: 'p1',
      lockedAt: new Date(),
      status: 'DISCUSSING',
      totalAmountRubles: 12000,
      serviceId: null,
      categoryId: null,
    };
    const tx = {
      request: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue(current),
        update: vi.fn(),
      },
      requestPriceProposal: {
        findFirst: vi.fn().mockResolvedValue({ id: 'pp1' }),
      },
      requestContractFile: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const prisma = {
      $transaction: async (run: (client: typeof tx) => Promise<unknown>) =>
        run(tx),
    };
    await expect(
      makeService(prisma).acceptContractByCustomer('u1', 'r1', {
        termsVersion: '2026-08-04',
      }),
    ).rejects.toThrow('At least one approved contract bundle is required');
    expect(tx.request.update).not.toHaveBeenCalled();
  });

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
          .mockResolvedValueOnce([{ bundleId: 'b1', status: 'APPROVED' }]),
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
          .mockResolvedValueOnce([{ bundleId: 'b1', status: 'APPROVED' }])
          .mockResolvedValueOnce([{ bundleId: 'b1', status: 'APPROVED' }]),
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
    ).rejects.toMatchObject({
      message: 'All requested documents must be uploaded',
    });
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
