import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

const USER_ID = '22222222-2222-4222-8222-222222222222';

describe('AuthService.signup', () => {
  it('регистрирует исполнителя без имени и города', async () => {
    const tx = {
      user: {
        create: vi.fn().mockResolvedValue({
          id: USER_ID,
          email: 'pro@example.com',
          name: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      legalAcceptance: { createMany: vi.fn().mockResolvedValue({ count: 3 }) },
    };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
    };
    const legalDocs = {
      assertCurrentVersions: vi.fn().mockResolvedValue({
        terms: '2026-08-04',
        privacy: '2026-08-04',
        consent: '2026-08-04',
      }),
    };
    const service = new AuthService(prisma as never, legalDocs as never);

    await service.signup({
      email: 'pro@example.com',
      password: 'secret1',
      accountKind: 'PROVIDER',
      acceptedLegal: {
        terms: '2026-08-04',
        privacy: '2026-08-04',
        consent: '2026-08-04',
      },
    });

    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'pro@example.com',
          accountKind: 'PROVIDER',
          name: undefined,
          customerCityId: undefined,
        }),
      }),
    );
  });
});
