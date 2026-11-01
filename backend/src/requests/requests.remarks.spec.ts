import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RequestsService } from './requests.service';

function makeService(prisma: any) {
  const auth = {} as any;
  const internalAuth = {} as any;
  const legalDocs = {} as any;
  const chat = { notifyMessageCreated: vi.fn() } as any;
  return new RequestsService(prisma, auth, internalAuth, legalDocs, chat);
}

describe('RequestsService remarks checklist', () => {
  it('sendRemarksByCustomer требует хотя бы одно OPEN замечание заказчика, если текст не передан', async () => {
    const tx = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'ACCEPTANCE_PENDING',
          autoAcceptAt: null,
          customerUserId: 'u1',
        }),
      },
      requestRemark: {
        count: vi.fn().mockResolvedValue(0),
      },
      requestEvent: { create: vi.fn() },
    };

    const prisma = {
      $transaction: async (fn: any) => await fn(tx),
    };

    const svc = makeService(prisma);

    await expect(
      svc.sendRemarksByCustomer('u1', 'r1', { remarks: null }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sendRemarksByCustomer связывает новое замечание с текущей версией сдачи', async () => {
    const now = new Date('2026-11-01T10:00:00.000Z');
    const tx = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'ACCEPTANCE_PENDING',
          autoAcceptAt: null,
          customerUserId: 'u1',
        }),
        update: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'ACTIVE',
          serviceId: null,
          categoryId: null,
          providerId: 'p1',
          customerUserId: 'u1',
          requestCityId: null,
          message: null,
          location: null,
          cadastralNumbers: [],
          lockedAt: now,
          dealTerms: null,
          offerVersion: null,
          termsVersion: null,
          contractAcceptedAt: now,
          acceptanceRequestedAt: null,
          autoAcceptAt: null,
          acceptedAt: null,
          totalAmountRubles: null,
          servicePriceRubles: null,
          createdAt: now,
          updatedAt: now,
          service: null,
          category: null,
          provider: null,
          customerUser: null,
          providerOffers: [],
          payments: [],
          priceProposals: [],
          deliverySubmissions: [],
        }),
      },
      requestDeliverySubmission: {
        findFirst: vi.fn().mockResolvedValue({ id: 's2' }),
      },
      requestRemark: {
        create: vi.fn().mockResolvedValue({ id: 'rm1' }),
      },
      requestEvent: { create: vi.fn() },
    };
    const prisma = { $transaction: async (fn: any) => await fn(tx) };
    const svc = makeService(prisma);

    await svc.sendRemarksByCustomer('u1', 'r1', { remarks: 'Нужно исправить' });

    expect(tx.requestRemark.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ submissionId: 's2' }),
      select: { id: true },
    });
  });

  it('createRemarkByProvider создаёт замечание сразу отправленным (sentAt!=null)', async () => {
    const tx = {
      request: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: 'r1', status: 'ACCEPTANCE_PENDING' }),
      },
      requestRemark: {
        create: vi.fn().mockResolvedValue({
          id: 'rm1',
          requestId: 'r1',
          authorSide: 'PROVIDER',
          status: 'OPEN',
          text: '...',
          createdAt: new Date(),
          doneAt: null,
          sentAt: new Date(),
        }),
      },
      requestEvent: { create: vi.fn() },
    };
    const prisma = {
      request: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'ACCEPTANCE_PENDING',
          providerId: 'p1',
        }),
      },
      $transaction: async (fn: any) => await fn(tx),
    };
    const svc = makeService(prisma);
    (svc as any).getProById = vi.fn().mockResolvedValue({});

    await svc.createRemarkByProvider('p1', 'r1', { text: 'test' });

    expect(tx.requestRemark.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authorSide: 'PROVIDER',
          sentAt: expect.any(Date),
        }),
      }),
    );
  });

  it('completeRemarkByProvider запрещает закрывать замечание, созданное провайдером', async () => {
    const tx = {
      request: {
        findUnique: vi.fn().mockResolvedValue({ id: 'r1', status: 'ACTIVE' }),
      },
      requestRemark: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'rm1',
          requestId: 'r1',
          authorSide: 'PROVIDER',
          status: 'OPEN',
          text: '...',
          createdAt: new Date(),
          doneAt: null,
          sentAt: new Date(),
        }),
      },
      requestEvent: { create: vi.fn() },
    };

    const prisma = {
      request: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: 'r1', status: 'ACTIVE', providerId: 'p1' }),
      },
      $transaction: async (fn: any) => await fn(tx),
    };

    const svc = makeService(prisma);
    // bypass access guard details; only exercise the rule inside method
    (svc as any).getProById = vi.fn().mockResolvedValue({});

    await expect(
      svc.completeRemarkByProvider('p1', 'r1', 'rm1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('markServiceRenderedByProvider блокирует переход при OPEN замечаниях', async () => {
    const tx = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'ACTIVE',
          providerId: 'p1',
        }),
      },
      requestRemark: {
        count: vi.fn().mockResolvedValue(1),
      },
      requestEvent: { create: vi.fn() },
    };

    const prisma = {
      $transaction: async (fn: any) => await fn(tx),
    };

    const svc = makeService(prisma);

    await expect(
      svc.markServiceRenderedByProvider('p1', 'r1', { summary: 'Готово' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.requestRemark.count).toHaveBeenCalledWith({
      where: { requestId: 'r1', status: 'OPEN' },
    });
  });

  it('markServiceRenderedByProvider создаёт первую версию сдачи до запуска срока приёмки', async () => {
    const now = new Date('2026-11-01T10:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const tx = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'ACTIVE',
          providerId: 'p1',
        }),
        update: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'ACCEPTANCE_PENDING',
          serviceId: null,
          categoryId: null,
          providerId: 'p1',
          customerUserId: 'u1',
          requestCityId: null,
          message: null,
          location: null,
          cadastralNumbers: [],
          lockedAt: now,
          dealTerms: null,
          offerVersion: null,
          termsVersion: null,
          contractAcceptedAt: now,
          acceptanceRequestedAt: now,
          autoAcceptAt: new Date('2026-11-08T10:00:00.000Z'),
          acceptedAt: null,
          totalAmountRubles: null,
          servicePriceRubles: null,
          createdAt: now,
          updatedAt: now,
          service: null,
          category: null,
          provider: null,
          customerUser: null,
          providerOffers: [],
          payments: [],
          priceProposals: [],
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'ACCEPTANCE_PENDING',
          serviceId: null,
          categoryId: null,
          providerId: 'p1',
          customerUserId: 'u1',
          requestCityId: null,
          message: null,
          location: null,
          cadastralNumbers: [],
          lockedAt: now,
          dealTerms: null,
          offerVersion: null,
          termsVersion: null,
          contractAcceptedAt: now,
          acceptanceRequestedAt: now,
          autoAcceptAt: new Date('2026-11-08T10:00:00.000Z'),
          acceptedAt: null,
          totalAmountRubles: null,
          servicePriceRubles: null,
          createdAt: now,
          updatedAt: now,
          service: null,
          category: null,
          provider: null,
          customerUser: null,
          providerOffers: [],
          payments: [],
          priceProposals: [],
          deliverySubmissions: [],
        }),
      },
      requestRemark: { count: vi.fn().mockResolvedValue(0) },
      requestDeliverySubmission: {
        aggregate: vi.fn().mockResolvedValue({ _max: { sequence: null } }),
        create: vi.fn().mockResolvedValue({
          id: 's1',
          requestId: 'r1',
          providerId: 'p1',
          sequence: 1,
          summary: 'Результат готов',
          submittedByUserId: null,
          submittedAt: now,
        }),
      },
      requestEvent: { create: vi.fn() },
    };
    const prisma = { $transaction: async (fn: any) => await fn(tx) };
    const svc = makeService(prisma);

    await svc.markServiceRenderedByProvider('p1', 'r1', {
      summary: 'Результат готов',
    });

    expect(tx.requestDeliverySubmission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requestId: 'r1',
        providerId: 'p1',
        sequence: 1,
        summary: 'Результат готов',
      }),
      select: expect.any(Object),
    });
    expect(tx.request.updateMany).toHaveBeenCalledWith({
      where: { id: 'r1', status: 'ACTIVE' },
      data: expect.objectContaining({
        status: 'ACCEPTANCE_PENDING',
        acceptanceRequestedAt: now,
      }),
    });
    vi.useRealTimers();
  });
});
