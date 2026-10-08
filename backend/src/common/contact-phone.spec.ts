import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  assertContactPhone,
  normalizeOptionalContactPhone,
} from './contact-phone';

describe('normalizeOptionalContactPhone', () => {
  it('оставляет поле нетронутым, если его не передали', () => {
    expect(normalizeOptionalContactPhone(undefined)).toBeUndefined();
  });

  it('очищает телефон пустой строкой и null', () => {
    expect(normalizeOptionalContactPhone(null)).toBeNull();
    expect(normalizeOptionalContactPhone('   ')).toBeNull();
  });

  it('схлопывает пробелы в валидном номере', () => {
    expect(normalizeOptionalContactPhone('+7  900 000-00-00')).toBe(
      '+7 900 000-00-00',
    );
  });

  it('отклоняет номер с недостаточным числом цифр', () => {
    expect(() => assertContactPhone('12345')).toThrow(BadRequestException);
    expect(() => normalizeOptionalContactPhone('не телефон')).toThrow(
      BadRequestException,
    );
  });
});
