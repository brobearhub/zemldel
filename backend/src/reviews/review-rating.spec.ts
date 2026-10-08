import { describe, expect, it } from 'vitest';
import {
  bayesianScore,
  displayRating,
  formatAuthorDisplayName,
  normalizeReviewText,
  ratingSortScore,
} from './review-rating';

describe('review rating', () => {
  it('сглаживает одну пятёрку сильнее, чем плотный рейтинг 4.7', () => {
    const singleFive = bayesianScore(5, 1);
    const many = bayesianScore(4.7, 80);
    expect(singleFive).toBeLessThan(many);
    expect(ratingSortScore(5, 1)).toBe(4.1667);
    expect(ratingSortScore(4.7, 80)).toBeGreaterThan(4.6);
  });

  it('не строит балл без отзывов', () => {
    expect(displayRating(null, 0)).toBeNull();
    expect(ratingSortScore(5, 0)).toBeNull();
  });

  it('округляет показ до одного знака от сырого среднего', () => {
    expect(displayRating(4.74, 2)).toBe(4.7);
    expect(displayRating(4.75, 2)).toBe(4.8);
  });

  it('форматирует публичное имя', () => {
    expect(formatAuthorDisplayName('Анна Кузнецова')).toBe('Анна К.');
    expect(formatAuthorDisplayName('Михаил')).toBe('Михаил');
    expect(formatAuthorDisplayName('  ')).toBe('Заказчик');
    expect(formatAuthorDisplayName(null)).toBe('Заказчик');
  });

  it('пустой текст отзыва становится null', () => {
    expect(normalizeReviewText('  ')).toBeNull();
    expect(normalizeReviewText(' спасибо ')).toBe('спасибо');
  });
});
