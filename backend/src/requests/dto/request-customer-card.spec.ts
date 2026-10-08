import { describe, expect, it } from 'vitest';
import { requestRowToCustomerDtoPlain, type RequestDbRow } from './request.dto';

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
    service: { title: 'Межевание участка', image: 'https://cdn.example/service.jpg' },
    category: { name: 'Кадастр' },
    ...overrides,
  };
}

describe('requestRowToCustomerDtoPlain card fields', () => {
  it('отдаёт название услуги, категории и фото услуги', () => {
    const dto = requestRowToCustomerDtoPlain(makeRow());

    expect(dto.serviceTitle).toBe('Межевание участка');
    expect(dto.serviceImage).toBe('https://cdn.example/service.jpg');
    expect(dto.categoryName).toBe('Кадастр');
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
