import { REQUEST_STATUS_VALUES, type RequestStatus } from './dto/request.dto';

export type ProRequestStatusCounts = Record<RequestStatus, number>;

export type ProRequestStats = {
  total: number;
  byStatus: ProRequestStatusCounts;
  latestUpdatedAt: string | null;
};

export type ProRequestStatusBucket = {
  status: string;
  count: number;
  latestUpdatedAt: Date | string | null;
};

function emptyStatusCounts(): ProRequestStatusCounts {
  return {
    NEW: 0,
    DISCUSSING: 0,
    TERMS_AGREED: 0,
    ACTIVE: 0,
    ACCEPTANCE_PENDING: 0,
    ACCEPTED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
    CLOSED: 0,
  };
}

function isRequestStatus(value: string): value is RequestStatus {
  return (REQUEST_STATUS_VALUES as readonly string[]).includes(value);
}

/** Why: обзор показывает воронку статусов, а не карточки заявок. */
export function foldProRequestStats(buckets: readonly ProRequestStatusBucket[]): ProRequestStats {
  const byStatus = emptyStatusCounts();
  let total = 0;
  let latestMs: number | null = null;

  for (const bucket of buckets) {
    if (!isRequestStatus(bucket.status)) continue;
    const count = Number(bucket.count);
    if (!Number.isFinite(count) || count <= 0) continue;
    byStatus[bucket.status] += count;
    total += count;
    if (bucket.latestUpdatedAt == null) continue;
    const at = new Date(bucket.latestUpdatedAt).getTime();
    if (Number.isNaN(at)) continue;
    if (latestMs == null || at > latestMs) latestMs = at;
  }

  return {
    total,
    byStatus,
    latestUpdatedAt: latestMs == null ? null : new Date(latestMs).toISOString(),
  };
}
