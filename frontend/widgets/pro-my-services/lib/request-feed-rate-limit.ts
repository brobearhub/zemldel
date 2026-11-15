const listeners = new Set<() => void>();
let retryAt = 0;

export class RequestFeedRateLimitError extends Error {
  constructor() {
    super("Вы слишком часто запрашиваете заявки. Подождите немного.");
    this.name = "RequestFeedRateLimitError";
  }
}

export function getRequestFeedRetryAt() {
  return retryAt;
}

export function getRequestFeedRetrySeconds() {
  return Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
}

export function subscribeRequestFeedRateLimit(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setRequestFeedRetryAfter(seconds: number) {
  retryAt = Math.max(retryAt, Date.now() + Math.ceil(seconds) * 1000);
  listeners.forEach((listener) => listener());
}

export function clearRequestFeedRateLimit() {
  retryAt = 0;
  listeners.forEach((listener) => listener());
}
