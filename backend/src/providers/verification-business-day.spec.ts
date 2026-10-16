import { describe, expect, it } from 'vitest';
import { isOlderThanOneBusinessDay } from './verification-business-day';

describe('isOlderThanOneBusinessDay', () => {
  it('в пределах одного рабочего дня не подсвечивает', () => {
    const submitted = new Date('2026-10-14T10:00:00.000Z');
    const now = new Date('2026-10-15T09:00:00.000Z');
    expect(isOlderThanOneBusinessDay(submitted, now)).toBe(false);
  });

  it('после рабочего дня подсвечивает и пропускает выходные', () => {
    const friday = new Date('2026-10-16T10:00:00.000Z');
    const mondayMorning = new Date('2026-10-19T09:00:00.000Z');
    const mondayEvening = new Date('2026-10-19T11:00:00.000Z');
    expect(isOlderThanOneBusinessDay(friday, mondayMorning)).toBe(false);
    expect(isOlderThanOneBusinessDay(friday, mondayEvening)).toBe(true);
  });
});
