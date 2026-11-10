export type FreeRequestMarker = { requestId: string; createdAt: string };
export type FreeRequestNoticeState = {
  initialized: boolean;
  latest: FreeRequestMarker | null;
  seen: FreeRequestMarker | null;
};
export const emptyFreeRequestNotice = (): FreeRequestNoticeState => ({
  initialized: false,
  latest: null,
  seen: null,
});

export function isFreeRequestMarker(
  value: unknown,
): value is FreeRequestMarker {
  if (!value || typeof value !== "object") return false;
  const marker = value as Partial<FreeRequestMarker>;
  return (
    typeof marker.requestId === "string" &&
    marker.requestId.length > 0 &&
    typeof marker.createdAt === "string" &&
    Number.isFinite(Date.parse(marker.createdAt))
  );
}

function newer(
  left: FreeRequestMarker | null,
  right: FreeRequestMarker | null,
) {
  if (!left) return right;
  if (!right) return left;
  const difference = Date.parse(left.createdAt) - Date.parse(right.createdAt);
  return difference > 0 ||
    (difference === 0 && left.requestId >= right.requestId)
    ? left
    : right;
}

export function receiveFreeRequest(
  state: FreeRequestNoticeState,
  marker: FreeRequestMarker | null,
  snapshot = false,
): FreeRequestNoticeState {
  const latest = newer(state.latest, marker);
  return {
    initialized: true,
    latest,
    seen: snapshot && !state.initialized ? latest : state.seen,
  };
}

export function hasNewFreeRequests(state: FreeRequestNoticeState) {
  return Boolean(
    state.latest && state.latest.requestId !== state.seen?.requestId,
  );
}
