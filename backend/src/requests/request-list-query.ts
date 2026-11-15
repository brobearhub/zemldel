import type { Prisma } from '@prisma/client';

export type RequestListScope =
  | { kind: 'service'; serviceId: string }
  | { kind: 'free' };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requestListScopeWhere(
  scope: RequestListScope,
): Prisma.RequestWhereInput {
  return scope.kind === 'free'
    ? { serviceId: null }
    : { serviceId: scope.serviceId };
}

export const REQUEST_FEED_EXCLUDED_STATUSES = [
  'COMPLETED',
  'CLOSED',
  'CANCELLED',
] as const;

/** Terminal requests never occupy a page in the feed. */
export function requestListAssignedWhere(
  providerId: string,
  scope: RequestListScope,
): Prisma.RequestWhereInput {
  return {
    AND: [
      { providerId },
      { status: { notIn: [...REQUEST_FEED_EXCLUDED_STATUSES] } },
      requestListScopeWhere(scope),
    ],
  };
}

export type RequestListFeedQuery = {
  serviceId?: string;
  scope?: string;
  limit?: string;
  cursor?: string;
  search?: string;
};

export type RequestFeedCursor = {
  id: string;
  createdAt: string;
  priority: number;
};

export function encodeRequestFeedCursor(cursor: RequestFeedCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export type ParsedRequestListFeed =
  | {
      ok: true;
      scope: RequestListScope;
      limit: number;
      cursor: RequestFeedCursor | null;
      search: string;
    }
  | { ok: false; message: string };

export function parseRequestListFeedQuery(
  query: RequestListFeedQuery,
): ParsedRequestListFeed {
  if (
    Object.values(query).some(
      (value) => value !== undefined && typeof value !== 'string',
    )
  ) {
    return { ok: false, message: 'Некорректные параметры списка' };
  }
  const serviceId = query.serviceId?.trim() ?? '';
  const scope = query.scope?.trim() ?? '';
  const hasService = serviceId.length > 0;
  const hasScope = scope.length > 0;

  if (hasService === hasScope) {
    return { ok: false, message: 'Укажите услугу или свободные заявки' };
  }
  let listScope: RequestListScope;
  if (hasScope) {
    if (scope !== 'free')
      return { ok: false, message: 'Неизвестная область списка' };
    listScope = { kind: 'free' };
  } else {
    if (!UUID_RE.test(serviceId)) {
      return { ok: false, message: 'Некорректный идентификатор услуги' };
    }
    listScope = { kind: 'service', serviceId };
  }
  const limit = query.limit === undefined ? 3 : Number(query.limit);
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 5 ||
    (query.limit !== undefined && !/^\d+$/.test(query.limit))
  ) {
    return { ok: false, message: 'Размер страницы должен быть от 1 до 5' };
  }
  if ((query.search?.length ?? 0) > 200) {
    return { ok: false, message: 'Слишком длинный поисковый запрос' };
  }
  let cursor: RequestFeedCursor | null = null;
  if (query.cursor) {
    try {
      if (query.cursor.length > 512) throw new Error();
      const value: unknown = JSON.parse(
        Buffer.from(query.cursor, 'base64url').toString(),
      );
      if (
        !value ||
        typeof value !== 'object' ||
        !('id' in value) ||
        !('createdAt' in value) ||
        !('priority' in value) ||
        typeof value.id !== 'string' ||
        !UUID_RE.test(value.id) ||
        typeof value.createdAt !== 'string' ||
        !Number.isFinite(Date.parse(value.createdAt)) ||
        typeof value.priority !== 'number' ||
        !Number.isInteger(value.priority) ||
        value.priority < 0 ||
        value.priority > 3
      )
        throw new Error();
      cursor = {
        id: value.id,
        createdAt: new Date(value.createdAt).toISOString(),
        priority: value.priority,
      };
    } catch {
      return { ok: false, message: 'Некорректная страница заявок' };
    }
  }
  return {
    ok: true,
    scope: listScope,
    limit,
    cursor,
    search: (query.search ?? '')
      .toLocaleLowerCase('ru-RU')
      .replace(/ё/g, 'е')
      .replace(/[№#]/g, ' ')
      .trim()
      .replace(/\s+/g, ' '),
  };
}
