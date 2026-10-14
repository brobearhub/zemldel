import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ProvidersService } from './providers.service';

const CITY_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const PROVIDER_ID = '33333333-3333-4333-8333-333333333333';

function makeService(overrides?: { existingPersonal?: { id: string } | null }) {
  const tx = {
    provider: {
      create: vi
        .fn()
        .mockImplementation(
          ({
            data,
          }: {
            data: { name: string; slug: string; type: string };
          }) => ({
            id: PROVIDER_ID,
            ...data,
          }),
        ),
    },
    providerMember: { create: vi.fn().mockResolvedValue({}) },
    providerLegalProfile: { create: vi.fn().mockResolvedValue({}) },
    user: { update: vi.fn().mockResolvedValue({}) },
    legalAcceptance: { create: vi.fn().mockResolvedValue({}) },
  };
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        accountKind: 'PROVIDER',
        systemRole: 'CUSTOMER',
      }),
    },
    city: {
      findUnique: vi.fn().mockResolvedValue({
        id: CITY_ID,
        typeName: 'г',
        level: 5,
        status: 'ACTIVE',
      }),
    },
    provider: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(overrides?.existingPersonal ?? null),
    },
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) =>
      fn(tx),
    ),
  };
  const authService = {
    getUserAuthContext: vi.fn().mockResolvedValue({ id: USER_ID }),
  };
  const legalDocs = {
    assertCurrentVersions: vi.fn().mockResolvedValue({ offer: '2026-08-04' }),
  };
  const service = new ProvidersService(
    prisma as never,
    authService as never,
    legalDocs as never,
    {} as never,
  );
  return { service, tx, prisma };
}

const offerVersion = '2026-08-04';

describe('ProvidersService.getPublicProviderProfile', () => {
  it('не подставляет выдуманные показатели и не отдаёт реквизиты', async () => {
    const { service, prisma } = makeService();
    prisma.provider.findUnique.mockResolvedValue({
      id: PROVIDER_ID,
      name: 'Иван Петров',
      slug: 'ivan-petrov',
      type: 'INDIVIDUAL',
      rating: null,
      reviewCount: 0,
      city: null,
      image: null,
      subtitle: null,
      about: null,
      phone: null,
      email: null,
      useOwnEmail: false,
      stats: null,
      ownerUser: { image: null, email: 'secret@example.com' },
    });

    const profile = await service.getPublicProviderProfile(PROVIDER_ID);

    expect(profile.name).toBe('Иван П.');
    expect(profile.subtitle).toBe('');
    expect(profile.about).toBeNull();
    expect(profile.stats).toEqual([]);
    expect(profile).not.toHaveProperty('inn');
    expect(profile).not.toHaveProperty('ogrn');
    expect(profile).not.toHaveProperty('ownerEmail');
  });
});

describe('ProvidersService.createProvider', () => {
  it('создаёт физлицо и пишет ФИО в профиль и пользователя', async () => {
    const { service, tx } = makeService();
    await service.createProvider(USER_ID, {
      type: 'INDIVIDUAL',
      cityId: CITY_ID,
      offerVersion,
      legal: { lastName: 'Петров', firstName: 'Иван', inn: '123456789012' },
    });

    expect(tx.provider.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Иван Петров',
          slug: 'ivan-petrov',
          type: 'INDIVIDUAL',
          cityId: CITY_ID,
          verificationStatus: 'NOT_VERIFIED',
        }),
      }),
    );
    expect(tx.providerLegalProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        lastName: 'Петров',
        firstName: 'Иван',
        inn: null,
        ogrn: null,
        legalName: null,
      }),
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: expect.objectContaining({
        activeProviderId: PROVIDER_ID,
        name: 'Иван Петров',
        lastName: 'Петров',
        firstName: 'Иван',
        middleName: null,
      }),
    });
    expect(tx.providerMember.create).toHaveBeenCalledOnce();
    expect(tx.legalAcceptance.create).toHaveBeenCalledOnce();
  });

  it('создаёт самозанятого', async () => {
    const { service, tx } = makeService();
    await service.createProvider(USER_ID, {
      type: 'SELF_EMPLOYED',
      cityId: CITY_ID,
      offerVersion,
      legal: {
        lastName: 'Смирнова',
        firstName: 'Анна',
        middleName: 'Ивановна',
        inn: '123456789012',
      },
    });
    expect(tx.provider.create.mock.calls[0]?.[0].data).toEqual(
      expect.objectContaining({ name: 'Анна Смирнова', type: 'SELF_EMPLOYED' }),
    );
  });

  it('создаёт ИП с ОГРНИП', async () => {
    const { service, tx } = makeService();
    await service.createProvider(USER_ID, {
      type: 'SOLE_PROPRIETOR',
      cityId: CITY_ID,
      offerVersion,
      legal: {
        lastName: 'Петров',
        firstName: 'Иван',
        middleName: 'Сергеевич',
        inn: '123456789012',
        ogrn: '123456789012345',
      },
    });
    expect(tx.provider.create.mock.calls[0]?.[0].data.name).toBe(
      'ИП Петров И. С.',
    );
    expect(tx.providerLegalProfile.create.mock.calls[0]?.[0].data).toEqual(
      expect.objectContaining({ inn: null, ogrn: null }),
    );
  });

  it('создаёт организацию и пишет контактное лицо в пользователя', async () => {
    const { service, tx } = makeService();
    await service.createProvider(USER_ID, {
      type: 'COMPANY',
      cityId: CITY_ID,
      offerVersion,
      legal: {
        legalName: 'ООО Ромашка',
        inn: '1234567890',
        ogrn: '1234567890123',
      },
      contact: { lastName: 'Петров', firstName: 'Иван' },
    });
    expect(tx.provider.create.mock.calls[0]?.[0].data).toEqual(
      expect.objectContaining({
        name: 'ООО Ромашка',
        slug: 'ooo-romashka',
        type: 'COMPANY',
      }),
    );
    expect(tx.providerLegalProfile.create.mock.calls[0]?.[0].data).toEqual(
      expect.objectContaining({
        legalName: 'ООО Ромашка',
        inn: null,
        ogrn: null,
        lastName: null,
        firstName: null,
      }),
    );
    expect(tx.user.update.mock.calls[0]?.[0].data).toEqual(
      expect.objectContaining({
        name: 'Иван Петров',
        lastName: 'Петров',
        firstName: 'Иван',
      }),
    );
  });

  it('создаёт профиль без реквизитов и не сохраняет присланный ИНН', async () => {
    const { service, tx } = makeService();
    await service.createProvider(USER_ID, {
      type: 'INDIVIDUAL',
      cityId: CITY_ID,
      offerVersion,
      legal: { lastName: 'Петров', firstName: 'Иван', inn: '123' },
    });
    expect(tx.providerLegalProfile.create.mock.calls[0]?.[0].data).toEqual(
      expect.objectContaining({ inn: null, ogrn: null }),
    );
    expect(tx.provider.create.mock.calls[0]?.[0].data.verificationStatus).toBe(
      'NOT_VERIFIED',
    );
  });

  it('переводит гонку уникального индекса личного профиля в конфликт', async () => {
    const { service, prisma } = makeService();
    prisma.$transaction.mockRejectedValue({
      code: 'P2002',
      meta: { target: 'Provider_one_personal_profile_per_owner' },
    });
    await expect(
      service.createProvider(USER_ID, {
        type: 'INDIVIDUAL',
        cityId: CITY_ID,
        offerVersion,
        legal: { lastName: 'Петров', firstName: 'Иван', inn: '123456789012' },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('не даёт второму личному профилю того же владельца', async () => {
    const { service } = makeService({ existingPersonal: { id: PROVIDER_ID } });
    await expect(
      service.createProvider(USER_ID, {
        type: 'SELF_EMPLOYED',
        cityId: CITY_ID,
        offerVersion,
        legal: { lastName: 'Петров', firstName: 'Иван', inn: '123456789012' },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
