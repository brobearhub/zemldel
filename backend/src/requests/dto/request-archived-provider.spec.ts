import { describe, expect, it } from 'vitest';
import { requestRowToProDtoPlain, type RequestDbRow } from './request.dto';

function makeLockedRow(): RequestDbRow {
  return {
    id: '00000000-0000-0000-0000-000000000010',
    status: 'ACTIVE',
    serviceId: null,
    categoryId: null,
    providerId: '00000000-0000-0000-0000-000000000020',
    customerUserId: '00000000-0000-0000-0000-000000000011',
    requestCityId: null,
    message: 'Нужно межевание',
    location: 'Московская область',
    cadastralNumbers: ['50:12:0000000:51755'],
    lockedAt: new Date('2026-11-01T10:00:00.000Z'),
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-11-01T10:00:00.000Z'),
  };
}

describe('requestRowToProDtoPlain archived provider', () => {
  it('скрывает кадастровые номера даже при доступе к базовому контексту', () => {
    const dto = requestRowToProDtoPlain(
      makeLockedRow(),
      1,
      '00000000-0000-0000-0000-000000000030',
      { revealMessageForLocked: true },
    );

    expect(dto.isLocked).toBe(true);
    expect(dto.message).toBe('Нужно межевание');
    expect(dto.cadastralNumbers).toEqual([]);
  });
});
