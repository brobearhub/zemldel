import { describe, expect, it } from 'vitest';
import { placeNameLikePatterns, regionMatchesQuery } from './city-suggest.lib';

describe('placeNameLikePatterns', () => {
  it('экранирует служебные символы LIKE и добавляет префикс', () => {
    expect(placeNameLikePatterns('ор')).toEqual({
      prefix: 'ор%',
      heroPrefix: 'город-герой ор%',
    });
    expect(placeNameLikePatterns('100%_\\')).toEqual({
      prefix: '100\\%\\_\\\\%',
      heroPrefix: 'город-герой 100\\%\\_\\\\%',
    });
  });

  it('не удваивает приставку город-герой', () => {
    expect(placeNameLikePatterns('город-герой Волгоград')).toEqual({
      prefix: 'город-герой Волгоград%',
      heroPrefix: null,
    });
  });
});

describe('regionMatchesQuery', () => {
  it('находит область по короткому и полному названию', () => {
    expect(regionMatchesQuery('обл. Московская', 'моск')).toBe(true);
    expect(regionMatchesQuery('обл. Московская', 'московская область')).toBe(
      true,
    );
    expect(regionMatchesQuery('обл. Московская', 'к')).toBe(false);
    expect(regionMatchesQuery('обл. Московская', 'казань')).toBe(false);
  });

  it('срабатывает только с начала названия, не из середины', () => {
    expect(regionMatchesQuery('обл. Орловская', 'ор')).toBe(true);
    expect(regionMatchesQuery('обл. Оренбургская', 'ор')).toBe(true);
    expect(regionMatchesQuery('Нижегородская область', 'ор')).toBe(false);
    expect(regionMatchesQuery('обл. Белгородская', 'ор')).toBe(false);
    expect(regionMatchesQuery('обл. Воронежская', 'ор')).toBe(false);
    expect(regionMatchesQuery('Приморский край', 'ор')).toBe(false);
  });

  it('находит республику по имени без слова Республика', () => {
    expect(regionMatchesQuery('Республика Татарстан', 'тат')).toBe(true);
    expect(regionMatchesQuery('Республика Бурятия', 'бурят')).toBe(true);
    expect(regionMatchesQuery('Республика Мордовия', 'ор')).toBe(false);
  });
});
