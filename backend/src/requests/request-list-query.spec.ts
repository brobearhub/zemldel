import { describe, expect, it } from 'vitest';
import {
  parseRequestListFeedQuery,
  encodeRequestFeedCursor,
  requestListAssignedWhere,
} from './request-list-query';

const SERVICE_ID = '11111111-1111-4111-8111-111111111111';

describe('requestListAssignedWhere', () => {
  it('не включает завершённые заявки исполнителя', () => {
    expect(
      requestListAssignedWhere('provider-1', {
        kind: 'service',
        serviceId: SERVICE_ID,
      }),
    ).toEqual({
      AND: [
        { providerId: 'provider-1' },
        { status: { notIn: ['COMPLETED', 'CLOSED', 'CANCELLED'] } },
        { serviceId: SERVICE_ID },
      ],
    });
  });
});

describe('parseRequestListFeedQuery', () => {
  it('принимает услугу', () => {
    expect(parseRequestListFeedQuery({ serviceId: SERVICE_ID })).toEqual({
      ok: true,
      limit: 3,
      cursor: null,
      search: '',
      scope: { kind: 'service', serviceId: SERVICE_ID },
    });
  });

  it('принимает свободные заявки', () => {
    expect(parseRequestListFeedQuery({ scope: 'free' })).toEqual({
      ok: true,
      limit: 3,
      cursor: null,
      search: '',
      scope: { kind: 'free' },
    });
  });

  it('accepts a continuation cursor and normalized search', () => {
    const cursor = {
      id: SERVICE_ID,
      createdAt: '2026-01-01T00:00:00.000Z',
      priority: 1,
    };
    expect(
      parseRequestListFeedQuery({
        serviceId: SERVICE_ID,
        limit: '5',
        cursor: encodeRequestFeedCursor(cursor),
        search: ' № 27  АРТЁМ ',
      }),
    ).toEqual({
      ok: true,
      scope: { kind: 'service', serviceId: SERVICE_ID },
      limit: 5,
      cursor,
      search: '27 артем',
    });
  });

  it.each(['0', '6', '10', '-1', '1.5', 'abc', ''])(
    'rejects page size %s',
    (limit) => {
      expect(
        parseRequestListFeedQuery({ serviceId: SERVICE_ID, limit }).ok,
      ).toBe(false);
    },
  );
  it('rejects invalid cursors and oversized searches', () => {
    expect(
      parseRequestListFeedQuery({ serviceId: SERVICE_ID, cursor: 'bad' }).ok,
    ).toBe(false);
    expect(
      parseRequestListFeedQuery({
        serviceId: SERVICE_ID,
        search: 'a'.repeat(201),
      }).ok,
    ).toBe(false);
  });

  it.each([
    [{}, 'Укажите услугу или свободные заявки'],
    [
      { serviceId: SERVICE_ID, scope: 'free' },
      'Укажите услугу или свободные заявки',
    ],
    [{ scope: 'archive' }, 'Неизвестная область списка'],
    [{ serviceId: 'not-a-uuid' }, 'Некорректный идентификатор услуги'],
  ])('%j отклоняется: %s', (query, message) => {
    expect(parseRequestListFeedQuery(query)).toEqual({ ok: false, message });
  });
});
