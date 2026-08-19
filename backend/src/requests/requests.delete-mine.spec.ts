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
            { providerId: 'p1', status: 'SELECTED', selectedAt: now, declinedAt: null },
          ],
        }),
        false,
      ),
    ).toBe(false);
  });
});

describe('RequestsService.deleteMineByCustomer', () => {
  it('not found → NotFoundException', async () => {
    const prisma = {
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
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
});
