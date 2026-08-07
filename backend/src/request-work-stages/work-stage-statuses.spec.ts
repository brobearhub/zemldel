import { describe, expect, it } from 'vitest';
import {
  SYSTEM_WORK_STAGE_STATUSES,
  isSystemWorkStageStatusKey,
  resolveStatusLabel,
} from './work-stage-statuses';

describe('work-stage-statuses', () => {
  it('has unique system keys', () => {
    const keys = SYSTEM_WORK_STAGE_STATUSES.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('recognizes system status keys', () => {
    expect(isSystemWorkStageStatusKey('AWAITING_RESPONSE')).toBe(true);
    expect(isSystemWorkStageStatusKey('custom_foo')).toBe(false);
  });

  it('resolves system and custom labels', () => {
    expect(resolveStatusLabel('AWAITING_RESPONSE', [])).toBe('Ожидание ответа');
    expect(
      resolveStatusLabel('custom_1', [{ key: 'custom_1', label: 'Мой статус' }]),
    ).toBe('Мой статус');
    expect(resolveStatusLabel('missing', [])).toBeNull();
  });
});
