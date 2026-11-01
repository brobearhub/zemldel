import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { parseMarkRenderedDto } from './mark-rendered.dto';

describe('parseMarkRenderedDto', () => {
  it.each([
    [{ summary: '' }],
    [{ summary: '   ' }],
    [{ summary: 'x'.repeat(2001) }],
    [{}],
  ])('отклоняет невалидный итог сдачи: %o', (input) => {
    expect(parseMarkRenderedDto(input).data).toBeNull();
  });

  it('обрезает итог сдачи и принимает длину от 1 до 2000 символов', () => {
    const result = parseMarkRenderedDto({ summary: '  Готовый результат  ' });

    expect(result).toEqual({
      data: { summary: 'Готовый результат' },
      issues: null,
    });
  });
});
