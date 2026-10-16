import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ProviderVerificationAdminService } from './provider-verification-admin.service';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const REQUEST_ID = '44444444-4444-4444-8444-444444444444';
const PROVIDER_ID = '33333333-3333-4333-8333-333333333333';

function requestRow(status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING') {
  return {
    id: REQUEST_ID,
    providerId: PROVIDER_ID,
    status,
    inn: '667220294240',
    ogrn: null,
    submittedSnapshot: {
      lastName: 'Усова',
      firstName: 'Вера',
      middleName: null,
      legalName: null,
      inn: '667220294240',
      ogrn: null,
    },
    provider: {
      id: PROVIDER_ID,
      name: 'Вера Усова',
      verificationStatus: 'PENDING',
      ownerUser: { email: 'owner@example.com' },
      city: { name: 'Екатеринбург' },
    },
  };
}

function makeService(options?: {
  role?: string;
  status?: 'PENDING' | 'APPROVED';
  taken?: boolean;
}) {
  const mail = { send: vi.fn().mockResolvedValue(undefined) };
  const tx = {
    providerVerificationRequest: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    provider: { update: vi.fn().mockResolvedValue({}) },
  };
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        systemRole: options?.role ?? 'PLATFORM_ADMIN',
      }),
    },
    provider: {
      findFirst: vi
        .fn()
        .mockResolvedValue(options?.taken ? { id: 'other' } : null),
    },
    providerVerificationRequest: {
      findUnique: vi
        .fn()
        .mockResolvedValue(requestRow(options?.status ?? 'PENDING')),
      count: vi.fn().mockResolvedValue(3),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<void>) =>
      fn(tx),
    ),
  };
  const service = new ProviderVerificationAdminService(prisma as never, mail);
  return { service, prisma, tx, mail };
}

describe('ProviderVerificationAdminService', () => {
  it('отказывает не-администратору', async () => {
    const { service } = makeService({ role: 'CUSTOMER' });
    await expect(service.approve(ADMIN_ID, REQUEST_ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('подтверждение ставит VERIFIED и уникальный ИНН', async () => {
    const { service, tx, mail } = makeService();
    await service.approve(ADMIN_ID, REQUEST_ID);
    expect(tx.provider.update).toHaveBeenCalledWith({
      where: { id: PROVIDER_ID },
      data: expect.objectContaining({
        verificationStatus: 'VERIFIED',
        verifiedInn: '667220294240',
      }),
    });
    expect(mail.send).toHaveBeenCalledOnce();
  });

  it('не подтверждает ИНН, занятый другим профилем', async () => {
    const { service, tx } = makeService({ taken: true });
    await expect(service.approve(ADMIN_ID, REQUEST_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.provider.update).not.toHaveBeenCalled();
  });

  it('не отклоняет без причины и пишет причину при отказе', async () => {
    const { service, tx } = makeService();
    await expect(
      service.reject(ADMIN_ID, REQUEST_ID, '  '),
    ).rejects.toBeInstanceOf(BadRequestException);
    await service.reject(ADMIN_ID, REQUEST_ID, 'ИНН не найден в реестре');
    expect(tx.provider.update).toHaveBeenCalledWith({
      where: { id: PROVIDER_ID },
      data: expect.objectContaining({
        verificationStatus: 'REJECTED',
        verificationRejectReason: 'ИНН не найден в реестре',
        verifiedInn: null,
      }),
    });
  });

  it('ручная отметка ФНС не ставит значок', async () => {
    const { service, prisma, tx } = makeService();
    await service.markFnsManual(ADMIN_ID, REQUEST_ID);
    expect(prisma.providerVerificationRequest.update).toHaveBeenCalledWith({
      where: { id: REQUEST_ID },
      data: expect.objectContaining({
        fnsManualCheckedByUserId: ADMIN_ID,
      }),
    });
    expect(tx.provider.update).not.toHaveBeenCalled();
  });

  it('не меняет уже записанное решение', async () => {
    const { service, tx } = makeService({ status: 'APPROVED' });
    await expect(
      service.reject(ADMIN_ID, REQUEST_ID, 'Поздно'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.providerVerificationRequest.updateMany).not.toHaveBeenCalled();
  });
});
