import { describe, expect, it, vi } from 'vitest';
import { RequestsService } from './requests.service';
import { randomUUID } from 'node:crypto';

function setup() {
  let committed = false;
  let inTransaction = false;
  const row = {
    id: randomUUID(),
    status: 'NEW',
    serviceId: null,
    categoryId: null as string | null,
    providerId: null,
    customerUserId: 'customer',
    requestCityId: null,
    message: 'Нужна консультация',
    location: null,
    lockedAt: null,
    service: null,
    category: null,
    provider: null,
    customerUser: null,
    servicePriceRubles: null,
    totalAmountRubles: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  let receipt: unknown = null;
  const tx = {
    $executeRaw: vi.fn(),
    writeOperation: {
      findUnique: vi.fn(() => receipt),
      create: vi.fn(({ data }: { data: unknown }) => {
        receipt = data;
      }),
    },
    request: {
      create: vi.fn(() => {
        if (!inTransaction) committed = true;
        return row;
      }),
    },
  };
  const prisma = {
    ...tx,
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'customer',
        accountKind: 'CUSTOMER',
        systemRole: 'CUSTOMER',
        customerCityId: null,
        email: 'qa@example.test',
      }),
    },
    serviceCategory: {
      findUnique: vi.fn().mockResolvedValue({ id: 'category' }),
    },
    $transaction: vi.fn(async (fn: (db: typeof tx) => Promise<unknown>) => {
      inTransaction = true;
      const result = await fn(tx);
      committed = true;
      inTransaction = false;
      return result;
    }),
  };
  const chat = {
    notifyFreeRequestCreated: vi.fn(() => expect(committed).toBe(true)),
  };
  const service = new RequestsService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    chat as never,
  );
  return { service, prisma, chat, row };
}

describe('new free request broadcast', () => {
  it.each(['freeform', 'category'])(
    'notifies after %s creation commits and suppresses an idempotent replay',
    async (kind) => {
      const { service, chat, prisma, row } = setup();
      if (kind === 'category') row.categoryId = 'category';
      const input = {
        message: 'Нужна консультация',
        operationId: randomUUID(),
      };
      const create = () =>
        kind === 'category'
          ? service.createForCategory('category', 'customer', input)
          : service.createUnlinked('customer', input);
      await create();
      await create();
      expect(prisma.request.create).toHaveBeenCalledTimes(1);
      expect(chat.notifyFreeRequestCreated.mock.calls).toEqual([
        [
          {
            requestId: row.id,
            createdAt: row.createdAt.toISOString(),
            categoryId: row.categoryId,
            regionCode: null,
          },
        ],
      ]);
    },
  );

  it('supports creation without an operation ID', async () => {
    const { service, chat } = setup();
    await service.createUnlinked('customer', { message: 'Нужна консультация' });
    expect(chat.notifyFreeRequestCreated).toHaveBeenCalledTimes(1);
  });

  it('does not broadcast failed writes and does not fail a committed write when delivery fails', async () => {
    const { service, prisma, chat } = setup();
    prisma.request.create.mockRejectedValueOnce(
      new Error('database unavailable'),
    );
    await expect(
      service.createUnlinked('customer', { message: 'Нужна консультация' }),
    ).rejects.toThrow();
    expect(chat.notifyFreeRequestCreated).not.toHaveBeenCalled();
    chat.notifyFreeRequestCreated.mockImplementation(() => {
      throw new Error('socket unavailable');
    });
    await expect(
      service.createUnlinked('customer', { message: 'Нужна консультация' }),
    ).resolves.toHaveProperty('id');
  });
});
