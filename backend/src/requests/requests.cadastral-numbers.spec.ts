import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RequestsService } from './requests.service';

function makeService(prisma: any) {
  const auth = {} as any;
  const internalAuth = {} as any;
  const legalDocs = {} as any;
  const chat = { notifyMessageCreated: vi.fn() } as any;
  const svc = new RequestsService(prisma, auth, internalAuth, legalDocs, chat);
  (svc as any).getMineById = vi
    .fn()
    .mockResolvedValue({ id: 'r1', cadastralNumbers: ['50:12:0000000:51755'] });
  (svc as any).getProById = vi
    .fn()
    .mockResolvedValue({ id: 'r1', cadastralNumbers: ['50:12:0000000:51755'] });
  (svc as any).requireProviderAccessToRequest = vi
    .fn()
    .mockResolvedValue({ id: 'r1', status: 'NEW' });
  return svc;
}

describe('RequestsService cadastral numbers', () => {
  it('appendCadastralNumberByCustomer rejects duplicate values', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([
        {
          id: 'r1',
          status: 'NEW',
          providerId: null,
          customerUserId: 'u1',
          cadastralNumbers: ['50:12:0000000:51755'],
        },
      ]),
      request: {
        update: vi.fn(),
      },
    };
    const prisma = {
      $transaction: async (fn: any) => await fn(tx),
    };
    const svc = makeService(prisma);

    await expect(
      svc.appendCadastralNumberByCustomer('u1', 'r1', {
        value: '50:12:0000000:51755',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.request.update).not.toHaveBeenCalled();
  });

  it('deleteCadastralNumberByCustomer removes item by index', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([
        {
          id: 'r1',
          status: 'ACTIVE',
          providerId: null,
          customerUserId: 'u1',
          cadastralNumbers: ['50:12:0000000:51755', '50:12:0000000:51756'],
        },
      ]),
      request: {
        update: vi.fn(),
      },
    };
    const prisma = {
      $transaction: async (fn: any) => await fn(tx),
    };
    const svc = makeService(prisma);

    await svc.deleteCadastralNumberByCustomer('u1', 'r1', 0);

    expect(tx.request.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { cadastralNumbers: ['50:12:0000000:51756'] },
    });
  });

  it('appendCadastralNumberByProvider blocks terminal requests', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([
        {
          id: 'r1',
          status: 'COMPLETED',
          providerId: 'p1',
          cadastralNumbers: [],
        },
      ]),
      request: {
        update: vi.fn(),
      },
    };
    const prisma = {
      $transaction: async (fn: any) => await fn(tx),
    };
    const svc = makeService(prisma);

    await expect(
      svc.appendCadastralNumberByProvider('p1', 'r1', {
        value: '50:12:0000000:51755',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('appendCadastralNumberByProvider повторно проверяет выбранного provider внутри транзакции', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([
        {
          id: 'r1',
          status: 'ACTIVE',
          providerId: 'p2',
          cadastralNumbers: [],
        },
      ]),
      request: {
        update: vi.fn(),
      },
    };
    const prisma = {
      $transaction: async (fn: any) => await fn(tx),
    };
    const svc = makeService(prisma);

    await expect(
      svc.appendCadastralNumberByProvider('p1', 'r1', {
        value: '50:12:0000000:51755',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.$queryRaw).toHaveBeenCalledOnce();
    expect(tx.request.update).not.toHaveBeenCalled();
  });

  it('updateCadastralNumberByCustomer rejects invalid index', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([
        {
          id: 'r1',
          status: 'NEW',
          providerId: null,
          customerUserId: 'u1',
          cadastralNumbers: ['50:12:0000000:51755'],
        },
      ]),
      request: {
        update: vi.fn(),
      },
    };
    const prisma = {
      $transaction: async (fn: any) => await fn(tx),
    };
    const svc = makeService(prisma);

    await expect(
      svc.updateCadastralNumberByCustomer('u1', 'r1', 3, {
        value: '50:12:0000000:51756',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.request.update).not.toHaveBeenCalled();
  });

  it('appendCadastralNumberByCustomer rejects blank value', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([
        {
          id: 'r1',
          status: 'NEW',
          providerId: null,
          customerUserId: 'u1',
          cadastralNumbers: [],
        },
      ]),
      request: {
        update: vi.fn(),
      },
    };
    const prisma = {
      $transaction: async (fn: any) => await fn(tx),
    };
    const svc = makeService(prisma);

    await expect(
      svc.appendCadastralNumberByCustomer('u1', 'r1', { value: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.request.update).not.toHaveBeenCalled();
  });
});
