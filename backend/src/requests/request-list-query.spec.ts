import { describe, expect, it } from 'vitest';
import { parseRequestListFeedQuery, requestListAssignedWhere } from './request-list-query';

const SERVICE_ID = '11111111-1111-4111-8111-111111111111';

describe('requestListAssignedWhere', () => {
  it('не включает завершённые заявки исполнителя', () => {
    expect(requestListAssignedWhere('provider-1', { kind: 'service', serviceId: SERVICE_ID })).toEqual({
      AND: [{ providerId: 'provider-1' }, { status: { not: 'COMPLETED' } }, { serviceId: SERVICE_ID }],
    });
  });
});

describe('parseRequestListFeedQuery', () => {
  it('принимает услугу', () => {
    expect(parseRequestListFeedQuery({ serviceId: SERVICE_ID })).toEqual({
      ok: true,
      scope: { kind: 'service', serviceId: SERVICE_ID },
    });
  });

  it('принимает свободные заявки', () => {
    expect(parseRequestListFeedQuery({ scope: 'free' })).toEqual({
      ok: true,
      scope: { kind: 'free' },
    });
  });

  it.each([
    [{}, 'Укажите услугу или свободные заявки'],
    [{ serviceId: SERVICE_ID, scope: 'free' }, 'Укажите услугу или свободные заявки'],
    [{ scope: 'archive' }, 'Неизвестная область списка'],
    [{ serviceId: 'not-a-uuid' }, 'Некорректный идентификатор услуги'],
  ])('%j отклоняется: %s', (query, message) => {
    expect(parseRequestListFeedQuery(query)).toEqual({ ok: false, message });
  });
});
