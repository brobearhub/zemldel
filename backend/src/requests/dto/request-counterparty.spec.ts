import { describe, expect, it } from 'vitest';
import {
  requestRowToCustomerDtoPlain,
  requestRowToProDtoPlain,
  type RequestDbRow,
} from './request.dto';

const NOW = new Date('2026-08-13T00:00:00.000Z');
const PROVIDER_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_PROVIDER_ID = '22222222-2222-2222-2222-222222222222';

function makeRow(overrides: Partial<RequestDbRow> = {}): RequestDbRow {
  return {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    status: 'DISCUSSING',
    serviceId: null,
    categoryId: null,
    providerId: null,
    customerUserId: null,
    requestCityId: null,
    customerName: 'Иван Иванов',
    customerEmail: 'ivan@example.com',
    customerPhone: '+79991234567',
    message: 'need help',
    location: null,
    lockedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    provider: {
      name: 'Геодезия Плюс',
      legalProfile: { phone: '+73431234567', email: 'pro@example.com' },
      ownerUser: { image: 'https://cdn.example/provider.jpg' },
    },
    customerUser: {
      customerCityId: null,
      image: 'https://cdn.example/customer.jpg',
    },
    ...overrides,
  };
}

describe('requestRowToProDtoPlain counterparty contacts', () => {
  it('скрывает snapshot клиента до lock', () => {
    const dto = requestRowToProDtoPlain(makeRow(), 0, PROVIDER_ID);
    expect(dto.customerName).toBeNull();
    expect(dto.customerEmail).toBeNull();
    expect(dto.customerPhone).toBeNull();
    expect(dto.customerImage).toBeNull();
  });

  it('отдаёт snapshot клиента после lock на этого провайдера', () => {
    const dto = requestRowToProDtoPlain(
      makeRow({
        providerId: PROVIDER_ID,
        lockedAt: NOW,
      }),
      1,
      PROVIDER_ID,
    );
    expect(dto.customerName).toBe('Иван Иванов');
    expect(dto.customerEmail).toBe('ivan@example.com');
    expect(dto.customerPhone).toBe('+79991234567');
    expect(dto.customerImage).toBe('https://cdn.example/customer.jpg');
  });

  it('скрывает snapshot клиента у чужого провайдера', () => {
    const dto = requestRowToProDtoPlain(
      makeRow({
        providerId: PROVIDER_ID,
        lockedAt: NOW,
      }),
      1,
      OTHER_PROVIDER_ID,
      { revealMessageForLocked: true },
    );
    expect(dto.customerName).toBeNull();
    expect(dto.customerEmail).toBeNull();
    expect(dto.customerPhone).toBeNull();
    expect(dto.customerImage).toBeNull();
  });
});

describe('requestRowToCustomerDtoPlain counterparty contacts', () => {
  it('скрывает телефон и email исполнителя до lock', () => {
    const dto = requestRowToCustomerDtoPlain(makeRow({ providerId: PROVIDER_ID }));
    expect(dto.providerName).toBe('Геодезия Плюс');
    expect(dto.providerPhone).toBeNull();
    expect(dto.providerEmail).toBeNull();
    expect(dto.providerImage).toBeNull();
  });

  it('отдаёт контакты исполнителя из legal profile после lock', () => {
    const dto = requestRowToCustomerDtoPlain(
      makeRow({
        providerId: PROVIDER_ID,
        lockedAt: NOW,
      }),
    );
    expect(dto.providerName).toBe('Геодезия Плюс');
    expect(dto.providerPhone).toBe('+73431234567');
    expect(dto.providerEmail).toBe('pro@example.com');
    expect(dto.providerImage).toBe('https://cdn.example/provider.jpg');
  });
});

describe('request finance mapping', () => {
  const payment = {
    id: 'p1',
    type: 'CONTRACT' as const,
    amountKopecks: 500000,
    comment: 'Аванс',
    paidAt: NOW,
    createdAt: NOW,
  };

  it('скрывает журнал до lock у заказчика и исполнителя', () => {
    const row = makeRow({
      totalAmountKopecks: 2500000,
      payments: [payment],
    });
    const customer = requestRowToCustomerDtoPlain(row);
    const provider = requestRowToProDtoPlain(row, 0, PROVIDER_ID);
    expect(customer.totalAmountKopecks).toBeNull();
    expect(customer.paidAmountKopecks).toBe(0);
    expect(customer.remainingAmountKopecks).toBeNull();
    expect(customer.payments).toEqual([]);
    expect(provider.totalAmountKopecks).toBeNull();
    expect(provider.payments).toEqual([]);
  });

  it('отдаёт журнал после lock эксклюзивному исполнителю и заказчику', () => {
    const row = makeRow({
      providerId: PROVIDER_ID,
      lockedAt: NOW,
      totalAmountKopecks: 2500000,
      payments: [payment],
    });
    const customer = requestRowToCustomerDtoPlain(row);
    const provider = requestRowToProDtoPlain(row, 1, PROVIDER_ID);
    expect(customer.totalAmountKopecks).toBe(2500000);
    expect(customer.paidAmountKopecks).toBe(500000);
    expect(customer.remainingAmountKopecks).toBe(2000000);
    expect(customer.payments).toEqual([
      {
        id: 'p1',
        type: 'CONTRACT',
        amountKopecks: 500000,
        comment: 'Аванс',
        paidAt: NOW.toISOString(),
        createdAt: NOW.toISOString(),
      },
    ]);
    expect(provider.remainingAmountKopecks).toBe(2000000);
    expect(provider.payments).toHaveLength(1);
  });

  it('скрывает журнал у чужого провайдера после lock', () => {
    const dto = requestRowToProDtoPlain(
      makeRow({
        providerId: PROVIDER_ID,
        lockedAt: NOW,
        totalAmountKopecks: 2500000,
        payments: [payment],
      }),
      1,
      OTHER_PROVIDER_ID,
    );
    expect(dto.totalAmountKopecks).toBeNull();
    expect(dto.payments).toEqual([]);
  });
});
