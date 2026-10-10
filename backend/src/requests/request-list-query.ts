import type { Prisma } from '@prisma/client';

export type RequestListScope =
  | { kind: 'service'; serviceId: string }
  | { kind: 'free' };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requestListScopeWhere(scope: RequestListScope): Prisma.RequestWhereInput {
  return scope.kind === 'free' ? { serviceId: null } : { serviceId: scope.serviceId };
}

/** Why: завершённые сделки в ленту не попадают и не занимают лимит выборки. */
export function requestListAssignedWhere(
  providerId: string,
  scope: RequestListScope,
): Prisma.RequestWhereInput {
  return {
    AND: [{ providerId }, { status: { not: 'COMPLETED' } }, requestListScopeWhere(scope)],
  };
}

export type RequestListFeedQuery = {
  serviceId?: string;
  scope?: string;
};

export type ParsedRequestListFeed =
  | { ok: true; scope: RequestListScope }
  | { ok: false; message: string };

/** Why: список на /pro больше не режется шагом. Остаётся только область — услуга или свободные заявки. */
export function parseRequestListFeedQuery(query: RequestListFeedQuery): ParsedRequestListFeed {
  const serviceId = query.serviceId?.trim() ?? '';
  const scope = query.scope?.trim() ?? '';
  const hasService = serviceId.length > 0;
  const hasScope = scope.length > 0;

  if (hasService === hasScope) {
    return { ok: false, message: 'Укажите услугу или свободные заявки' };
  }
  if (hasScope) {
    if (scope !== 'free') return { ok: false, message: 'Неизвестная область списка' };
    return { ok: true, scope: { kind: 'free' } };
  }
  if (!UUID_RE.test(serviceId)) {
    return { ok: false, message: 'Некорректный идентификатор услуги' };
  }
  return { ok: true, scope: { kind: 'service', serviceId } };
}
