import { describe, expect, it } from 'vitest';
import {
  resolveFiasInactiveWarning,
  requestRowToCustomerDtoPlain,
  type RequestDbRow,
} from './request.dto';

function makeRow(overrides: Partial<RequestDbRow> = {}): RequestDbRow {
  return {
    id: '00000000-0000-0000-0000-000000000010',
    status: 'NEW',
    serviceId: null,
    categoryId: null,
    providerId: null,
    customerUserId: '00000000-0000-0000-0000-000000000011',
    requestCityId: null,
    message: null,
    location: null,
    cadastralNumbers: [],
    lockedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('request city lifecycle fields', () => {
  it('resolveFiasInactiveWarning is true for inactive requestCity', () => {
    expect(
      resolveFiasInactiveWarning(
        makeRow({
          requestCity: {
            id: '00000000-0000-0000-0000-000000000020',
            name: 'Old City',
            regionCode: '77',
            regionName: 'Москва',
            status: 'INACTIVE',
          },
        }),
      ),
    ).toBe(true);
  });

  it('requestRowToCustomerDtoPlain maps requestCity and warning', () => {
    const dto = requestRowToCustomerDtoPlain(
      makeRow({
        requestCityId: '00000000-0000-0000-0000-000000000020',
        requestCity: {
          id: '00000000-0000-0000-0000-000000000020',
          name: 'Old City',
          regionCode: '77',
          regionName: 'Москва',
          status: 'INACTIVE',
        },
      }),
    );

    expect(dto.requestCity).toEqual({
      id: '00000000-0000-0000-0000-000000000020',
      name: 'Old City',
      regionCode: '77',
      regionName: 'Москва',
    });
    expect(dto.fiasInactiveWarning).toBe(true);
  });
});
