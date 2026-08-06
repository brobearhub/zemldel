import { describe, expect, it } from 'vitest';
import {
  hasRequestLock,
  isExclusiveForActorProvider,
  isLockedToOtherProvider,
  isOrderExecutionStatus,
} from './request.dto';

describe('request lock helpers', () => {
  it('hasRequestLock is true only when lockedAt set', () => {
    expect(hasRequestLock({ lockedAt: null })).toBe(false);
    expect(hasRequestLock({ lockedAt: new Date() })).toBe(true);
    expect(hasRequestLock({ lockedAt: '2026-08-06T00:00:00.000Z' })).toBe(true);
  });

  it('does not treat providerId alone as lock (SERVICE pre-lock)', () => {
    expect(
      isLockedToOtherProvider({ lockedAt: null, providerId: 'p1' }, 'p2'),
    ).toBe(false);
  });

  it('locks other providers when lockedAt + other providerId', () => {
    expect(
      isLockedToOtherProvider({ lockedAt: new Date(), providerId: 'p1' }, 'p2'),
    ).toBe(true);
    expect(
      isExclusiveForActorProvider(
        { lockedAt: new Date(), providerId: 'p1' },
        'p1',
      ),
    ).toBe(true);
  });

  it('ORDER_EXECUTION_STATUSES no longer includes legacy values', () => {
    expect(isOrderExecutionStatus('ACTIVE')).toBe(true);
    expect(isOrderExecutionStatus('PROVIDER_SELECTED')).toBe(false);
    expect(isOrderExecutionStatus('CONTRACT_ACCEPTED')).toBe(false);
    expect(isOrderExecutionStatus('SERVICE_RENDERED')).toBe(false);
    expect(isOrderExecutionStatus('LOCKED')).toBe(false);
  });
});
