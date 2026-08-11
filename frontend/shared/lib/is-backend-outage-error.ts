/**
 * Client-safe outage detection.
 * Why: Next.js serializes errors into the client boundary and drops custom fields
 * (e.g. BackendApiError.status), so we match stable message patterns.
 */
export function isBackendOutageError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  if (/backend request failed with status 5\d\d/.test(message)) {
    return true;
  }

  const networkMarkers = [
    "econnrefused",
    "econnreset",
    "etimedout",
    "enotfound",
    "network error",
    "fetch failed",
    "socket hang up",
    "timeout of",
    "timed out",
  ] as const;

  return networkMarkers.some((marker) => message.includes(marker));
}
