import { fetchCityJson } from "./fetch-city-json";

const isList = (value: unknown): value is unknown[] => Array.isArray(value);

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("recovers on the third attempt after network and HTTP failures", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch")
    .mockRejectedValueOnce(new TypeError("Failed to fetch"))
    .mockResolvedValueOnce(new Response("{}", { status: 503 }))
    .mockResolvedValueOnce(new Response('["city"]'));
  await expect(fetchCityJson("/api/cities/capitals", isList)).resolves.toEqual(["city"]);
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it("stops after three invalid responses", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("{}"));
  await expect(fetchCityJson("/api/cities/capitals", isList)).rejects.toThrow();
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it("accepts an empty result without retries", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("[]"));
  await expect(fetchCityJson("/api/cities/suggest", isList)).resolves.toEqual([]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("retries timed-out requests with a fresh timeout and stops after three", async () => {
  vi.useFakeTimers();
  const signals: AbortSignal[] = [];
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((_url: RequestInfo | URL, init?: RequestInit) => new Promise((_resolve, reject) => {
    const signal = init!.signal!;
    signals.push(signal);
    signal.addEventListener("abort", () => reject(new DOMException("signal timed out", "AbortError")));
  }));
  const result = expect(fetchCityJson("/api/cities/capitals", isList)).rejects.toThrow("signal timed out");
  await vi.advanceTimersByTimeAsync(24000);
  await result;
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(new Set(signals).size).toBe(3);
});

it("does not retry a cancelled search", async () => {
  const controller = new AbortController();
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((_url: RequestInfo | URL, init?: RequestInit) => new Promise((_resolve, reject) => {
    init!.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  }));
  const result = expect(fetchCityJson("/api/cities/suggest", isList, controller.signal)).rejects.toThrow();
  controller.abort();
  await result;
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
