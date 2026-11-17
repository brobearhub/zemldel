import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { canCustomerDeleteRequest } from './dto/request.dto';
import { RequestsService } from './requests.service';

function makeRequestRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-08-06T00:00:00.000Z');
  return {
    id: 'r1',
    status: 'NEW',
    serviceId: null,
    categoryId: 'cat1',
    providerId: null,
    customerUserId: 'cu1',
    requestCityId: null,
    customerName: null,
    customerEmail: null,
    customerPhone: null,
    message: 'hi',
    location: null,
    lockedAt: null,
    dealTerms: null,
    offerVersion: null,
    termsVersion: null,
    contractAcceptedAt: null,
    acceptanceRequestedAt: null,
    autoAcceptAt: null,
    acceptedAt: null,
    createdAt: now,
    updatedAt: now,
    providerOffers: [],
    _count: { contractFiles: 0, documentRequests: 0, workStages: 0 },
    service: null,
    category: { name: 'Cat' },
    provider: null,
    customerUser: null,
    ...overrides,
  };
}

function makeService(prisma: unknown) {
  return new RequestsService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    { notifyMessageCreated: vi.fn() } as never,
  );
}

describe('canCustomerDeleteRequest', () => {
  it('разрешает удаление новой заявки без ответа исполнителя', () => {
    expect(canCustomerDeleteRequest(makeRequestRow(), false)).toBe(true);
  });

  it('запрещает удаление после ответа исполнителя', () => {
    expect(canCustomerDeleteRequest(makeRequestRow(), true)).toBe(false);
  });

  it('запрещает удаление после выбора компании', () => {
    const now = new Date('2026-08-06T00:00:00.000Z');
    expect(
      canCustomerDeleteRequest(
        makeRequestRow({
          providerOffers: [
            {
              providerId: 'p1',
              status: 'SELECTED',
              selectedAt: now,
              declinedAt: null,
            },
          ],
        }),
        false,
      ),
    ).toBe(false);
  });

  it('разрешает заявку услуги с автоматическим выбором исполнителя до его ответа', () => {
    const row = makeRequestRow({
      serviceId: 's1',
      providerId: 'p1',
      lockedAt: new Date(),
      totalAmountRubles: 11111,
      providerOffers: [{ providerId: 'p1', status: 'SELECTED' }],
    });
    expect(canCustomerDeleteRequest(row, false)).toBe(true);
    expect(canCustomerDeleteRequest(row, true)).toBe(false);
    expect(
      canCustomerDeleteRequest(
        { ...row, contractAcceptedAt: new Date() },
        false,
      ),
    ).toBe(false);
    expect(canCustomerDeleteRequest({ ...row, status: 'ACTIVE' }, false)).toBe(
      false,
    );
  });

  it.each(['contractFiles', 'documentRequests', 'workStages'] as const)(
    'не удаляет заявку услуги с сохранёнными файлами: %s',
    (kind) => {
      const row = makeRequestRow({
        serviceId: 's1',
        providerId: 'p1',
        lockedAt: new Date(),
        _count: {
          contractFiles: 0,
          documentRequests: 0,
          workStages: 0,
          [kind]: 1,
        },
      });
      expect(canCustomerDeleteRequest(row, false)).toBe(false);
    },
  );
});

describe('RequestsService.deleteMineByCustomer', () => {
  it('not found → NotFoundException', async () => {
    const prisma = {
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          $queryRaw: vi.fn().mockResolvedValue([]),
          request: { findFirst: vi.fn().mockResolvedValue(null) },
        }),
    };
    const svc = makeService(prisma);
    await expect(svc.deleteMineByCustomer('cu1', 'r1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('есть ответ исполнителя → ConflictException', async () => {
    const row = makeRequestRow();
    const tx = {
      $queryRaw: vi
        .fn()
        .mockResolvedValue([{ id: 'r1', customerUserId: 'cu1' }]),
      request: { findFirst: vi.fn().mockResolvedValue(row) },
      message: { findFirst: vi.fn().mockResolvedValue({ id: 'm1' }) },
    };
    const prisma = {
      $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    };
    const svc = makeService(prisma);
    await expect(svc.deleteMineByCustomer('cu1', 'r1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('без ответа удаляет заявку из базы', async () => {
    const row = makeRequestRow();
    const requestDelete = vi.fn().mockResolvedValue({ id: 'r1' });

    const tx = {
      $queryRaw: vi
        .fn()
        .mockResolvedValue([{ id: 'r1', customerUserId: 'cu1' }]),
      request: {
        findFirst: vi.fn().mockResolvedValue(row),
        delete: requestDelete,
      },
      message: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const prisma = {
      $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    };
    const svc = makeService(prisma);

    const result = await svc.deleteMineByCustomer('cu1', 'r1');

    expect(requestDelete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    expect(result).toEqual({ ok: true });
  });

  it('сверяет ответ исполнителя после блокировки заявки услуги', async () => {
    const row = makeRequestRow({
      serviceId: 's1',
      providerId: 'p1',
      lockedAt: new Date(),
      providerOffers: [{ providerId: 'p1', status: 'SELECTED' }],
    });
    const lock = vi
      .fn()
      .mockResolvedValue([{ id: 'r1', customerUserId: 'cu1' }]);
    const requestRead = vi.fn().mockResolvedValue(row);
    const messageRead = vi.fn().mockResolvedValue(null);
    const requestDelete = vi.fn().mockResolvedValue(row);
    const tx = {
      $queryRaw: lock,
      request: { findFirst: requestRead, delete: requestDelete },
      message: { findFirst: messageRead },
    };
    const svc = makeService({
      $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    });
    await expect(svc.deleteMineByCustomer('cu1', 'r1')).resolves.toEqual({
      ok: true,
    });
    expect(lock.mock.invocationCallOrder[0]).toBeLessThan(
      requestRead.mock.invocationCallOrder[0],
    );
    expect(requestRead.mock.invocationCallOrder[0]).toBeLessThan(
      messageRead.mock.invocationCallOrder[0],
    );
    expect(requestRead).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'r1', customerUserId: 'cu1' },
      }),
    );
    expect(messageRead).toHaveBeenCalledWith({
      where: {
        kind: 'USER',
        conversation: { requestId: 'r1', customerUserId: 'cu1' },
        NOT: { senderUserId: 'cu1' },
      },
      select: { id: true },
    });
    expect(requestDelete).toHaveBeenCalled();
  });

  it('не удаляет заявку услуги, если ответ появился до повторной проверки', async () => {
    const row = makeRequestRow({
      serviceId: 's1',
      providerId: 'p1',
      lockedAt: new Date(),
      providerOffers: [{ providerId: 'p1', status: 'SELECTED' }],
    });
    const requestDelete = vi.fn();
    const tx = {
      $queryRaw: vi
        .fn()
        .mockResolvedValue([{ id: 'r1', customerUserId: 'cu1' }]),
      request: {
        findFirst: vi.fn().mockResolvedValue(row),
        delete: requestDelete,
      },
      message: { findFirst: vi.fn().mockResolvedValue({ id: 'response' }) },
    };
    const svc = makeService({
      $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    });
    await expect(svc.deleteMineByCustomer('cu1', 'r1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(requestDelete).not.toHaveBeenCalled();
  });
});
