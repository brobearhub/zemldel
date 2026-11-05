const CITY_REQUEST_ATTEMPTS = 3;
const CITY_REQUEST_TIMEOUT_MS = 8000;

/** Each city lookup gets three attempts, each with its own timeout. */
export async function fetchCityJson<T>(
  url: string,
  isValid: (value: unknown) => value is T,
  signal?: AbortSignal,
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    signal?.throwIfAborted();
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, CITY_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      const payload: unknown = await response.json();
      if (!response.ok || !isValid(payload)) throw new Error("Не удалось загрузить города");
      return payload;
    } catch (error) {
      if (signal?.aborted || attempt === CITY_REQUEST_ATTEMPTS) throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
  }
}
