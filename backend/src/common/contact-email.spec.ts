import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  assertContactEmail,
  normalizeOptionalContactEmail,
} from './contact-email';

describe('normalizeOptionalContactEmail', () => {
  it('оставляет поле нетронутым, если его не передали', () => {
    expect(normalizeOptionalContactEmail(undefined)).toBeUndefined();
  });

  it('очищает email пустой строкой и null', () => {
    expect(normalizeOptionalContactEmail(null)).toBeNull();
    expect(normalizeOptionalContactEmail('   ')).toBeNull();
  });

  it('принимает обычный адрес', () => {
    expect(normalizeOptionalContactEmail(' owner@example.com ')).toBe(
      'owner@example.com',
    );
  });

  it('отклоняет строку без домена', () => {
    expect(() => assertContactEmail('not-an-email')).toThrow(
      BadRequestException,
    );
  });
});
