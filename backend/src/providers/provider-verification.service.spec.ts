import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { VERIFICATION_SUPPORT_HINT } from './provider-requisites';
import { ProviderVerificationService } from './provider-verification.service';

const USER_ID = '22222222-2222-4222-8222-222222222222';
const PROVIDER_ID = '33333333-3333-4333-8333-333333333333';

function makeService(options?: {
  type?: string;
  status?: string;
  taken?: boolean;
}) {
  const tx = {
    provider: { update: vi.fn().mockResolvedValue({}) },
    providerLegalProfile: { update: vi.fn().mockResolvedValue({}) },
    user: { update: vi.fn().mockResolvedValue({}) },
    providerVerificationRequest: { create: vi.fn().mockResolvedValue({}) },
  };
  const prisma = {
    providerMember: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ role: 'OWNER', status: 'ACTIVE' }),
    },
    provider: {
      findUnique: vi.fn().mockResolvedValue({
        id: PROVIDER_ID,
        type: options?.type ?? 'SELF_EMPLOYED',
        verificationStatus: options?.status ?? 'NOT_VERIFIED',
        verifiedAt: null,
        verificationRejectReason: null,
        legalProfile: {
          lastName: 'Усова',
          firstName: 'Вера',
          middleName: null,
          legalName: null,
          inn: null,
          ogrn: null,
        },
        verificationRequests: [],
      }),
      findFirst: vi
        .fn()
        .mockResolvedValue(options?.taken ? { id: 'other' } : null),
    },
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<void>) =>
      fn(tx),
    ),
  };
  const service = new ProviderVerificationService(prisma as never);
  return { service, tx, prisma };
}

describe('ProviderVerificationService.submitVerification', () => {
  it('создаёт заявку и переводит профиль в PENDING без ожидания ФНС', async () => {
    const { service, tx } = makeService();
    const result = await service.submitVerification(USER_ID, PROVIDER_ID, {
      lastName: 'Усова',
      firstName: 'Вера',
      inn: '667220294240',
    });

    expect(result.status).toBe('PENDING');
    expect(tx.provider.update).toHaveBeenCalledWith({
      where: { id: PROVIDER_ID },
      data: expect.objectContaining({
        verificationStatus: 'PENDING',
        verifiedAt: null,
        verifiedInn: null,
        name: 'Вера Усова',
      }),
    });
    expect(tx.providerVerificationRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerId: PROVIDER_ID,
        type: 'SELF_EMPLOYED',
        inn: '667220294240',
        ogrn: null,
        status: 'PENDING',
        displayName: 'Вера Усова',
      }),
    });
    expect(tx.providerLegalProfile.update.mock.calls[0]?.[0].data.inn).toBe(
      '667220294240',
    );
  });

  it('не создаёт заявку при неверной контрольной цифре', async () => {
    const { service, prisma } = makeService();
    await expect(
      service.submitVerification(USER_ID, PROVIDER_ID, {
        lastName: 'Усова',
        firstName: 'Вера',
        inn: '667220294241',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('отклоняет ИНН, уже подтверждённый в другом профиле', async () => {
    const { service } = makeService({ taken: true });
    try {
      await service.submitVerification(USER_ID, PROVIDER_ID, {
        lastName: 'Усова',
        firstName: 'Вера',
        inn: '667220294240',
      });
      expect.fail('ожидалась ошибка');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual({
        fieldErrors: { inn: VERIFICATION_SUPPORT_HINT },
      });
    }
  });

  it('не принимает вторую заявку, пока первая на проверке', async () => {
    const { service, prisma } = makeService({ status: 'PENDING' });
    await expect(
      service.submitVerification(USER_ID, PROVIDER_ID, {
        lastName: 'Усова',
        firstName: 'Вера',
        inn: '667220294240',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('у подтверждённого профиля снимает значок и пишет новую заявку', async () => {
    const { service, tx } = makeService({ status: 'VERIFIED' });
    await service.submitVerification(USER_ID, PROVIDER_ID, {
      lastName: 'Усова',
      firstName: 'Вера',
      inn: '667220294240',
    });
    expect(tx.provider.update.mock.calls[0]?.[0].data).toEqual(
      expect.objectContaining({
        verificationStatus: 'PENDING',
        verifiedInn: null,
        verifiedAt: null,
      }),
    );
    expect(tx.providerVerificationRequest.create).toHaveBeenCalledOnce();
  });
});
