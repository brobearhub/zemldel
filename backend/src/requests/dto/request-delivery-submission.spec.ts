import { describe, expect, it } from 'vitest';
import {
  requestRowToCustomerDtoPlain,
  requestRowToProDtoPlain,
  type RequestDbRow,
} from './request.dto';

const submittedAt = new Date('2026-11-01T10:00:00.000Z');

function makeRow(): RequestDbRow {
  return {
    id: 'r1',
    status: 'ACCEPTANCE_PENDING',
    serviceId: null,
    categoryId: null,
    providerId: 'p1',
    customerUserId: 'u1',
    requestCityId: null,
    message: null,
    location: null,
    lockedAt: submittedAt,
    createdAt: submittedAt,
    updatedAt: submittedAt,
    deliverySubmissions: [
      {
        id: 's1',
        sequence: 1,
        summary: 'Первая версия',
        submittedAt,
        remarks: [],
      },
      {
        id: 's2',
        sequence: 2,
        summary: 'Вторая версия',
        submittedAt: new Date('2026-11-02T10:00:00.000Z'),
        remarks: [],
      },
    ],
  };
}

describe('delivery submissions DTO visibility', () => {
  it('даёт customer текущую и упорядоченную историю', () => {
    const dto = requestRowToCustomerDtoPlain(makeRow());

    expect(dto.currentSubmission?.sequence).toBe(2);
    expect(dto.deliverySubmissions.map((item) => item.sequence)).toEqual([
      1, 2,
    ]);
  });

  it('даёт выбранному provider текущую и упорядоченную историю', () => {
    const dto = requestRowToProDtoPlain(makeRow(), 0, 'p1');

    expect(dto.currentSubmission).toMatchObject({
      id: 's2',
      sequence: 2,
      summary: 'Вторая версия',
    });
    expect(dto.deliverySubmissions.map((item) => item.sequence)).toEqual([
      1, 2,
    ]);
  });

  it('не отдаёт историю foreign locked provider', () => {
    const dto = requestRowToProDtoPlain(makeRow(), 0, 'p2');

    expect(dto.currentSubmission).toBeNull();
    expect(dto.deliverySubmissions).toEqual([]);
  });
});
