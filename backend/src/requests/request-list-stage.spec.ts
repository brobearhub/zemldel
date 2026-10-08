import { describe, expect, it } from 'vitest';
import type { RequestStatus } from './dto/request.dto';
import type { RequestListStage } from './request-list-stage';
import {
  foldRequestListStageCounts,
  matchesRequestListStage,
  parseRequestListFeedQuery,
  requestListStageWhere,
} from './request-list-stage';

const LOCKED_AT = new Date('2026-10-01T00:00:00.000Z');
const SERVICE_ID = '11111111-1111-4111-8111-111111111111';

describe('matchesRequestListStage', () => {
  it.each<[RequestStatus, Date | null, RequestListStage]>([
    ['NEW', null, 'NEW'],
    ['DISCUSSING', null, 'DISCUSSING'],
    ['TERMS_AGREED', null, 'DISCUSSING'],
    ['NEW', LOCKED_AT, 'CONTRACT'],
    ['DISCUSSING', LOCKED_AT, 'CONTRACT'],
    ['TERMS_AGREED', LOCKED_AT, 'CONTRACT'],
    ['ACTIVE', LOCKED_AT, 'WORK'],
    ['ACTIVE', null, 'WORK'],
    ['ACCEPTANCE_PENDING', LOCKED_AT, 'ACCEPTANCE'],
    ['ACCEPTED', LOCKED_AT, 'ACCEPTANCE'],
    ['COMPLETED', LOCKED_AT, 'COMPLETED'],
  ])('%s при lockedAt=%s попадает только в %s', (status, lockedAt, stage) => {
    expect(matchesRequestListStage({ status, lockedAt }, stage)).toBe(true);
    expect(matchesRequestListStage({ status, lockedAt }, stage === 'NEW' ? 'WORK' : 'NEW')).toBe(false);
  });

  it('отмена и закрытие без сделки не входят ни в один шаг', () => {
    expect(matchesRequestListStage({ status: 'CANCELLED', lockedAt: LOCKED_AT }, 'CONTRACT')).toBe(false);
    expect(matchesRequestListStage({ status: 'CLOSED', lockedAt: null }, 'NEW')).toBe(false);
    expect(matchesRequestListStage({ status: 'COMPLETED', lockedAt: LOCKED_AT }, 'WORK')).toBe(false);
  });
});

describe('foldRequestListStageCounts', () => {
  it('раскладывает группы агрегата по шагам и оставляет нули', () => {
    expect(
      foldRequestListStageCounts([
        { status: 'NEW', locked: false, count: 2 },
        { status: 'DISCUSSING', locked: false, count: 1 },
        { status: 'DISCUSSING', locked: true, count: 3 },
        { status: 'TERMS_AGREED', locked: false, count: 1 },
        { status: 'ACTIVE', locked: true, count: 4 },
        { status: 'ACCEPTANCE_PENDING', locked: true, count: 1 },
        { status: 'ACCEPTED', locked: false, count: 1 },
        { status: 'COMPLETED', locked: true, count: 5 },
        { status: 'CANCELLED', locked: true, count: 9 },
      ]),
    ).toEqual({
      NEW: 2,
      DISCUSSING: 2,
      CONTRACT: 3,
      WORK: 4,
      ACCEPTANCE: 2,
      COMPLETED: 5,
    });
  });
});

describe('requestListStageWhere', () => {
  it('сужает новые заявки статусом без фиксации сделки', () => {
    expect(requestListStageWhere('NEW')).toEqual({ status: 'NEW', lockedAt: null });
  });

  it('договор — зафиксированная сделка до начала работ', () => {
    expect(requestListStageWhere('CONTRACT')).toEqual({
      lockedAt: { not: null },
      status: { in: ['NEW', 'DISCUSSING', 'TERMS_AGREED'] },
    });
  });
});

describe('parseRequestListFeedQuery', () => {
  it('принимает шаг и услугу', () => {
    expect(parseRequestListFeedQuery({ stage: 'NEW', serviceId: SERVICE_ID })).toEqual({
      ok: true,
      stage: 'NEW',
      scope: { kind: 'service', serviceId: SERVICE_ID },
    });
  });

  it('принимает свободные заявки', () => {
    expect(parseRequestListFeedQuery({ stage: 'WORK', scope: 'free' })).toEqual({
      ok: true,
      stage: 'WORK',
      scope: { kind: 'free' },
    });
  });

  it.each([
    [{}, 'Неизвестный шаг списка'],
    [{ stage: 'ALL', serviceId: SERVICE_ID }, 'Неизвестный шаг списка'],
    [{ stage: 'NEW' }, 'Укажите услугу или свободные заявки'],
    [{ stage: 'NEW', serviceId: SERVICE_ID, scope: 'free' }, 'Укажите услугу или свободные заявки'],
    [{ stage: 'NEW', scope: 'archive' }, 'Неизвестная область списка'],
    [{ stage: 'NEW', serviceId: 'not-a-uuid' }, 'Некорректный идентификатор услуги'],
  ])('%j отклоняется: %s', (query, message) => {
    expect(parseRequestListFeedQuery(query)).toEqual({ ok: false, message });
  });
});
