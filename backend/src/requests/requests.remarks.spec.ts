import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ChatService } from '../chat/chat.service';
import { LegalDocsService } from '../legal-docs/legal-docs.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from './requests.service';

type TransactionMock = Partial<Prisma.TransactionClient>;

function makePrisma(tx: TransactionMock): PrismaService {
  const $transaction = async <T>(
    callback: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> => callback(tx as Prisma.TransactionClient);

  return { $transaction } as PrismaService;
}

function makeService(prisma: PrismaService) {
  const auth = Object.create(AuthService.prototype) as AuthService;
  const internalAuth = Object.create(
    InternalAuthService.prototype,
  ) as InternalAuthService;
  const legalDocs = Object.create(
    LegalDocsService.prototype,
  ) as LegalDocsService;
  const chat = Object.create(ChatService.prototype) as ChatService;
  vi.spyOn(chat, 'notifyMessageCreated').mockResolvedValue(undefined);
  return new RequestsService(prisma, auth, internalAuth, legalDocs, chat);
}

describe('RequestsService remarks checklist', () => {
  it.each([
    ['', 'пустой'],
    ['   ', 'пробельный'],
    ['x'.repeat(2001), 'длиннее 2000 символов'],
  ])('invalid summary (%s) атомарно не начинает сдачу', async (summary) => {
    const transaction = vi.fn();
    const svc = makeService({ $transaction: transaction } as PrismaService);

    await expect(
      svc.markServiceRenderedByProvider('p1', 'r1', { summary }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(transaction).not.toHaveBeenCalled();
  });

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

    const prisma = makePrisma(tx);

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
    const prisma = makePrisma(tx);
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
    const prisma = makePrisma(tx);
    Object.assign(prisma, {
      request: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'ACCEPTANCE_PENDING',
          providerId: 'p1',
        }),
      },
    });
    const svc = makeService(prisma);
    vi.spyOn(svc, 'getProById').mockResolvedValue(
      {} as Awaited<ReturnType<RequestsService['getProById']>>,
    );

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

    const prisma = makePrisma(tx);
    Object.assign(prisma, {
      request: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: 'r1', status: 'ACTIVE', providerId: 'p1' }),
      },
    });

    const svc = makeService(prisma);
    // bypass access guard details; only exercise the rule inside method
    vi.spyOn(svc, 'getProById').mockResolvedValue(
      {} as Awaited<ReturnType<RequestsService['getProById']>>,
    );

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

    const prisma = makePrisma(tx);

    const svc = makeService(prisma);

    await expect(
      svc.markServiceRenderedByProvider('p1', 'r1', { summary: 'Готово' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.requestRemark.count).toHaveBeenCalledWith({
      where: { requestId: 'r1', status: 'OPEN' },
    });
  });

  it('foreign provider не может сдать чужой результат', async () => {
    const tx = {
      request: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const svc = makeService(makePrisma(tx));

    await expect(
      svc.markServiceRenderedByProvider('p2', 'r1', { summary: 'Готово' }),
    ).rejects.toBeInstanceOf(NotFoundException);
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
    const prisma = makePrisma(tx);
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
