import type { Prisma } from '@prisma/client';
import type { RequestStatus } from './dto/request.dto';
import { isOrderExecutionStatus } from './dto/request.dto';

/** Шаги списка на главной про. Совпадают со степпером карточки заявки. */
export const REQUEST_LIST_STAGES = [
  'NEW',
  'DISCUSSING',
  'CONTRACT',
  'WORK',
  'ACCEPTANCE',
  'COMPLETED',
] as const;

export type RequestListStage = (typeof REQUEST_LIST_STAGES)[number];

export type RequestListScope =
  | { kind: 'service'; serviceId: string }
  | { kind: 'free' };

type StageRow = {
  status: RequestStatus;
  lockedAt: Date | string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRequestListStage(value: string): value is RequestListStage {
  return (REQUEST_LIST_STAGES as readonly string[]).includes(value);
}

/**
 * Why: «Договор» и «Принятие» не статусы. Тот же порядок, что у степпера:
 * отмена и закрытие без сделки отсекаются раньше фазы договора.
 */
export function matchesRequestListStage(row: StageRow, stage: RequestListStage): boolean {
  if (row.status === 'CLOSED' || row.status === 'CANCELLED') return false;
  const locked = row.lockedAt != null;
  if (locked && !isOrderExecutionStatus(row.status)) return stage === 'CONTRACT';
  if (row.status === 'ACTIVE') return stage === 'WORK';
  if (row.status === 'ACCEPTANCE_PENDING' || row.status === 'ACCEPTED') {
    return stage === 'ACCEPTANCE';
  }
  if (row.status === 'COMPLETED') return stage === 'COMPLETED';
  if (row.status === 'TERMS_AGREED' || row.status === 'DISCUSSING') {
    return stage === 'DISCUSSING';
  }
  return stage === 'NEW';
}

export function requestListStageWhere(stage: RequestListStage): Prisma.RequestWhereInput {
  switch (stage) {
    case 'NEW':
      return { status: 'NEW', lockedAt: null };
    case 'DISCUSSING':
      return { status: { in: ['DISCUSSING', 'TERMS_AGREED'] }, lockedAt: null };
    case 'CONTRACT':
      return {
        lockedAt: { not: null },
        status: { in: ['NEW', 'DISCUSSING', 'TERMS_AGREED'] },
      };
    case 'WORK':
      return { status: 'ACTIVE' };
    case 'ACCEPTANCE':
      return { status: { in: ['ACCEPTANCE_PENDING', 'ACCEPTED'] } };
    case 'COMPLETED':
      return { status: 'COMPLETED' };
    default: {
      const _exhaustive: never = stage;
      return _exhaustive;
    }
  }
}

export type RequestListStageCounts = Record<RequestListStage, number>;

export function emptyRequestListStageCounts(): RequestListStageCounts {
  return {
    NEW: 0,
    DISCUSSING: 0,
    CONTRACT: 0,
    WORK: 0,
    ACCEPTANCE: 0,
    COMPLETED: 0,
  };
}

export function requestListStageOf(row: StageRow): RequestListStage | null {
  for (const stage of REQUEST_LIST_STAGES) {
    if (matchesRequestListStage(row, stage)) return stage;
  }
  return null;
}

export type StageCountBucket = {
  status: RequestStatus;
  locked: boolean;
  count: number;
};

/** Why: группы агрегата — это не карточки заявок, их достаточно, чтобы заполнить все кружки. */
export function foldRequestListStageCounts(buckets: readonly StageCountBucket[]): RequestListStageCounts {
  const counts = emptyRequestListStageCounts();
  for (const bucket of buckets) {
    const stage = requestListStageOf({
      status: bucket.status,
      lockedAt: bucket.locked ? new Date(0) : null,
    });
    if (!stage) continue;
    counts[stage] += bucket.count;
  }
  return counts;
}

export function addRequestListStageCount(counts: RequestListStageCounts, row: StageRow): void {
  const stage = requestListStageOf(row);
  if (stage) counts[stage] += 1;
}

export function requestListScopeWhere(scope: RequestListScope): Prisma.RequestWhereInput {
  return scope.kind === 'free' ? { serviceId: null } : { serviceId: scope.serviceId };
}

export type RequestListFeedQuery = {
  stage?: string;
  serviceId?: string;
  scope?: string;
};

export type ParsedRequestListFeed =
  | { ok: true; stage: RequestListStage; scope: RequestListScope }
  | { ok: false; message: string };

export function parseRequestListFeedQuery(query: RequestListFeedQuery): ParsedRequestListFeed {
  const stage = query.stage?.trim() ?? '';
  if (!isRequestListStage(stage)) {
    return { ok: false, message: 'Неизвестный шаг списка' };
  }

  const serviceId = query.serviceId?.trim() ?? '';
  const scope = query.scope?.trim() ?? '';
  const hasService = serviceId.length > 0;
  const hasScope = scope.length > 0;

  if (hasService === hasScope) {
    return { ok: false, message: 'Укажите услугу или свободные заявки' };
  }
  if (hasScope) {
    if (scope !== 'free') return { ok: false, message: 'Неизвестная область списка' };
    return { ok: true, stage, scope: { kind: 'free' } };
  }
  if (!UUID_RE.test(serviceId)) {
    return { ok: false, message: 'Некорректный идентификатор услуги' };
  }
  return { ok: true, stage, scope: { kind: 'service', serviceId } };
}
