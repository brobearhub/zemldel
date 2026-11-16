import { describe, expect, it } from 'vitest';
import {
  requestRowToCustomerDtoPlain,
  requestRowToProDtoPlain,
  type RequestDbRow,
} from './request.dto';

function makeRow(overrides: Partial<RequestDbRow> = {}): RequestDbRow {
  return {
    id: '00000000-0000-0000-0000-000000000010',
    status: 'NEW',
    serviceId: '00000000-0000-0000-0000-000000000012',
    categoryId: '00000000-0000-0000-0000-000000000013',
    providerId: null,
    customerUserId: '00000000-0000-0000-0000-000000000011',
    requestCityId: null,
    message: 'нужно межевание',
    location: null,
    cadastralNumbers: [],
    lockedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    service: {
      title: 'Межевание участка',
      image: 'https://cdn.example/service.jpg',
    },
    category: { name: 'Кадастр' },
    ...overrides,
  };
}

describe('requestRowToCustomerDtoPlain card fields', () => {
  it('allows only the provider to change price without customer confirmation', () => {
    const row = makeRow({
      status: 'DISCUSSING',
      providerId: 'provider-a',
      contractAcceptedAt: null,
      priceProposals: [
        {
          id: 'proposal-a',
          providerId: 'provider-a',
          amountRubles: 15000,
          authorSide: 'PROVIDER',
          acceptedAt: null,
          createdAt: new Date('2026-11-15T00:00:00Z'),
        },
      ],
    });
    expect(requestRowToCustomerDtoPlain(row)).toMatchObject({
      canProposePrice: false,
      canAcceptPrice: false,
    });
    expect(requestRowToProDtoPlain(row, 1, 'provider-a')).toMatchObject({
      canProposePrice: true,
      canAcceptPrice: false,
    });
  });

  it.each(['NEW', 'DISCUSSING', 'TERMS_AGREED'])(
    'allows price changes in %s',
    (status) => {
      const row = makeRow({
        status,
        providerId: 'provider-a',
        contractAcceptedAt: null,
      });
      expect(
        requestRowToProDtoPlain(row, 1, 'provider-a').canProposePrice,
      ).toBe(true);
    },
  );

  it.each([
    'ACTIVE',
    'ACCEPTANCE_PENDING',
    'ACCEPTED',
    'COMPLETED',
    'CANCELLED',
    'CLOSED',
  ])('does not allow price changes in %s', (status) => {
    const row = makeRow({
      status,
      providerId: 'provider-a',
      contractAcceptedAt: null,
    });
    expect(requestRowToProDtoPlain(row, 1, 'provider-a').canProposePrice).toBe(
      false,
    );
  });

  it('keeps a legacy pending proposal available without treating it as the price', () => {
    const row = makeRow({
      providerId: 'provider-a',
      totalAmountRubles: null,
      priceProposals: [
        {
          id: 'old',
          providerId: 'provider-a',
          amountRubles: 22000,
          authorSide: 'PROVIDER',
          acceptedAt: null,
          isDirectSet: false,
          createdAt: new Date('2026-11-15T00:00:00Z'),
        },
      ],
    });
    expect(requestRowToProDtoPlain(row, 1, 'provider-a')).toMatchObject({
      totalAmountRubles: null,
      priceProposal: { id: 'old', amountRubles: 22000 },
      canAcceptPrice: false,
    });
    expect(requestRowToCustomerDtoPlain(row)).toMatchObject({
      totalAmountRubles: null,
      canAcceptPrice: false,
    });
  });

  it('exposes directly set prices only in their provider scope and not as acceptance', () => {
    const row = makeRow({
      providerId: null,
      totalAmountRubles: null,
      priceProposals: [
        {
          id: 'a',
          providerId: 'provider-a',
          amountRubles: 15000,
          authorSide: 'PROVIDER',
          acceptedAt: null,
          isDirectSet: true,
          createdAt: new Date('2026-11-15T00:00:00Z'),
        },
        {
          id: 'b',
          providerId: 'provider-b',
          amountRubles: 22000,
          authorSide: 'PROVIDER',
          acceptedAt: null,
          isDirectSet: true,
          createdAt: new Date('2026-11-15T00:00:00Z'),
        },
      ],
    });
    expect(requestRowToProDtoPlain(row, 1, 'provider-a')).toMatchObject({
      totalAmountRubles: 15000,
      priceProposal: null,
      canAcceptPrice: false,
    });
    expect(requestRowToProDtoPlain(row, 1, 'provider-b')).toMatchObject({
      totalAmountRubles: 22000,
      priceProposal: null,
      canAcceptPrice: false,
    });
    expect(requestRowToCustomerDtoPlain(row)).toMatchObject({
      totalAmountRubles: null,
      priceProposal: null,
    });
  });

  it('отдаёт название услуги, категории и фото услуги', () => {
    const dto = requestRowToCustomerDtoPlain(makeRow());

    expect(dto.serviceTitle).toBe('Межевание участка');
    expect(dto.serviceImage).toBe('https://cdn.example/service.jpg');
    expect(dto.categoryName).toBe('Кадастр');
    expect(dto.providerLastMessage).toBeNull();
    expect(dto.customerLastMessage).toBeNull();
    expect(dto.awaitingProviderReply).toBe(false);
  });

  it('не подставляет пустое фото услуги', () => {
    const dto = requestRowToCustomerDtoPlain(
      makeRow({
        service: { title: 'Межевание участка', image: '   ' },
        category: { name: 'Кадастр' },
      }),
    );

    expect(dto.serviceImage).toBeNull();
    expect(dto.categoryName).toBe('Кадастр');
  });
});
