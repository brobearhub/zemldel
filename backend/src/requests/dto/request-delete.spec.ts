import { describe, expect, it } from 'vitest';
import {
  canCustomerDeleteRequest,
  requestRowToCustomerDtoPlain,
} from './request.dto';

describe('canCustomerDeleteRequest', () => {
  const base = {
    status: 'DISCUSSING' as const,
    lockedAt: null,
    dealTerms: null,
    providerOffers: [] as Array<{
      providerId: string;
      status: 'SELECTED' | 'DECLINED';
      selectedAt: Date;
      declinedAt: Date | null;
    }>,
  };

  it('true для NEW/DISCUSSING без ответа', () => {
    expect(canCustomerDeleteRequest({ ...base, status: 'NEW' }, false)).toBe(
      true,
    );
    expect(canCustomerDeleteRequest(base, false)).toBe(true);
  });

  it('false при lockedAt', () => {
    expect(
      canCustomerDeleteRequest({ ...base, lockedAt: new Date() }, false),
    ).toBe(false);
  });

  it('false при dealTerms', () => {
    expect(
      canCustomerDeleteRequest({ ...base, dealTerms: { price: 100 } }, false),
    ).toBe(false);
  });

  it('маппится в RequestCustomerDto', () => {
    const now = new Date('2026-08-06T00:00:00.000Z');
    const dto = requestRowToCustomerDtoPlain(
      {
        id: 'r1',
        status: 'NEW',
        serviceId: null,
        categoryId: 'cat1',
        providerId: null,
        customerUserId: 'cu1',
        requestCityId: null,
        message: 'hi',
        location: null,
        lockedAt: null,
        dealTerms: null,
        createdAt: now,
        updatedAt: now,
        providerOffers: [],
      },
      { hasProviderResponse: false },
    );
    expect(dto.canDeleteByCustomer).toBe(true);
  });

  it('маппит удаление заявки услуги и блокирует его при наличии файла или ответа', () => {
    const now = new Date('2026-08-06T00:00:00.000Z');
    const row = {
      id: 'r1',
      status: 'NEW' as const,
      serviceId: 's1',
      categoryId: null,
      providerId: 'p1',
      customerUserId: 'cu1',
      requestCityId: null,
      message: 'hi',
      location: null,
      lockedAt: now,
      dealTerms: null,
      contractAcceptedAt: null,
      totalAmountRubles: 11111,
      createdAt: now,
      updatedAt: now,
      providerOffers: [
        {
          providerId: 'p1',
          status: 'SELECTED' as const,
          selectedAt: now,
          declinedAt: null,
        },
      ],
      _count: { contractFiles: 0, documentRequests: 0, workStages: 0 },
    };
    expect(
      requestRowToCustomerDtoPlain(row, { hasProviderResponse: false })
        .canDeleteByCustomer,
    ).toBe(true);
    expect(
      requestRowToCustomerDtoPlain(row, { hasProviderResponse: true })
        .canDeleteByCustomer,
    ).toBe(false);
    expect(
      requestRowToCustomerDtoPlain(
        { ...row, _count: { ...row._count, contractFiles: 1 } },
        { hasProviderResponse: false },
      ).canDeleteByCustomer,
    ).toBe(false);
  });
});
