import { describe, expect, it } from 'vitest';
import { slugify } from './provider-slug';

describe('slugify', () => {
  it('транслитерирует кириллическое имя', () => {
    expect(slugify('Иван Петров')).toBe('ivan-petrov');
  });

  it('транслитерирует название ИП', () => {
    expect(slugify('ИП Петров И. О.')).toBe('ip-petrov-i-o');
  });

  it('оставляет пустую строку, если транслитерировать нечего', () => {
    expect(slugify('---')).toBe('');
  });
});
