import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
let store: typeof import("../store");
beforeEach(async () => {
  vi.resetModules();
  store = await import("../store");
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe("favorites state", () => {
  it("loads all visible cards in a batch and keeps accounts isolated", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ services: ["one"], providers: [] }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    store.loadFavorite("customer", "services", "one");
    store.loadFavorite("customer", "services", "two");
    await vi.waitFor(() =>
      expect(
        store.favoriteSnapshot("customer", "services", "one").loading,
      ).toBe(false),
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).serviceIds).toEqual([
      "one",
      "two",
    ]);
    expect(store.favoriteSnapshot("customer", "services", "one").saved).toBe(
      true,
    );
    expect(store.favoriteSnapshot("another", "services", "one").saved).toBe(
      false,
    );
  });
  it("rolls back a failed save and keeps a saved item when removal fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(
            new Response(JSON.stringify({ message: "Сеть недоступна" }), {
              status: 503,
            }),
          ),
        ),
    );
    store.seedFavorite("customer", "services", "one", false);
    await expect(
      store.toggleFavorite("customer", "services", "one"),
    ).rejects.toThrow("Сеть недоступна");
    expect(store.favoriteSnapshot("customer", "services", "one")).toMatchObject(
      { saved: false, loading: false },
    );
    store.seedFavorite("customer", "services", "one", true);
    await expect(
      store.toggleFavorite("customer", "services", "one"),
    ).rejects.toThrow();
    expect(store.favoriteSnapshot("customer", "services", "one").saved).toBe(
      true,
    );
  });
  it("prevents duplicate writes while a toggle is pending", async () => {
    let resolve!: (value: Response) => void;
    const fetcher = vi.fn(
      () =>
        new Promise<Response>((done) => {
          resolve = done;
        }),
    );
    vi.stubGlobal("fetch", fetcher);
    store.seedFavorite("customer", "services", "one", false);
    const first = store.toggleFavorite("customer", "services", "one");
    await store.toggleFavorite("customer", "services", "one");
    resolve(new Response(JSON.stringify({ saved: true }), { status: 200 }));
    await first;
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(store.favoriteSnapshot("customer", "services", "one").saved).toBe(
      true,
    );
  });
});
