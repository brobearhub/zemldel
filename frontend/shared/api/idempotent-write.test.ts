import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchIdempotentWrite, completeWriteIntent } from "./idempotent-write";
const init = {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: "QA" }),
};
const created = () =>
  new Response(JSON.stringify({ id: "request" }), { status: 201 });
describe("durable write intents", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.unstubAllGlobals());
  it("keeps the key after a lost response and allocates a new intent only after acknowledgement", async () => {
    const f = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("response lost"))
      .mockImplementation(created);
    vi.stubGlobal("fetch", f);
    await expect(fetchIdempotentWrite("/api/qa/retry", init)).rejects.toThrow(
      "Ответ сервера не получен",
    );
    await fetchIdempotentWrite("/api/qa/retry", init);
    await fetchIdempotentWrite("/api/qa/retry", init);
    const ids = f.mock.calls.map(([, o]) => JSON.parse(o.body).operationId);
    expect(ids[0]).toBe(ids[1]);
    expect(ids[2]).not.toBe(ids[1]);
  });
  it("retains the key across module remounts and 401, even when optional null fields or key order differ", async () => {
    const f = vi
      .fn()
      .mockImplementationOnce(() => new Response("{}", { status: 401 }))
      .mockImplementation(created);
    vi.stubGlobal("fetch", f);
    await fetchIdempotentWrite("/api/qa/auth", {
      ...init,
      body: JSON.stringify({ message: "QA", requestCityId: null }),
    });
    vi.resetModules();
    const { fetchIdempotentWrite: remounted } =
      await import("./idempotent-write");
    await remounted("/api/qa/auth", init);
    expect(JSON.parse(f.mock.calls[0][1].body).operationId).toBe(
      JSON.parse(f.mock.calls[1][1].body).operationId,
    );
  });
  it("shares a key across simultaneous sends and rejects malformed success as acknowledgement", async () => {
    const f = vi
      .fn()
      .mockImplementation(() => new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", f);
    await Promise.all([
      fetchIdempotentWrite("/api/qa/parallel", init),
      fetchIdempotentWrite("/api/qa/parallel", init),
    ]);
    await fetchIdempotentWrite("/api/qa/parallel", init);
    const ids = f.mock.calls.map(([, o]) => JSON.parse(o.body).operationId);
    expect(new Set(ids).size).toBe(1);
  });
  it("keeps a multipart intent when the chosen files are retried", async () => {
    const f = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("lost"))
      .mockImplementation(
        () => new Response(JSON.stringify({ bundleId: "bundle" })),
      );
    vi.stubGlobal("fetch", f);
    const form = new FormData();
    form.append(
      "document",
      new File(["pdf"], "contract.pdf", { type: "application/pdf" }),
    );
    await expect(
      fetchIdempotentWrite("/api/qa/files", { method: "POST", body: form }),
    ).rejects.toThrow();
    const key = form.get("operationId");
    await fetchIdempotentWrite("/api/qa/files", { method: "POST", body: form });
    expect(form.get("operationId")).toBe(key);
  });
  it("never lets a background GET overwrite a pending write", async () => {
    const f = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("lost"))
      .mockImplementation(created);
    vi.stubGlobal("fetch", f);
    await expect(
      fetchIdempotentWrite("/api/qa/read-safe", init),
    ).rejects.toThrow();
    const before = JSON.parse(
      sessionStorage.getItem("pending-write:/api/qa/read-safe")!,
    ).id;
    await fetchIdempotentWrite("/api/qa/read-safe", { cache: "no-store" });
    expect(f.mock.calls[1][1].body).toBeUndefined();
    expect(
      JSON.parse(sessionStorage.getItem("pending-write:/api/qa/read-safe")!).id,
    ).toBe(before);
    await fetchIdempotentWrite("/api/qa/read-safe", init);
    expect(JSON.parse(f.mock.calls[2][1].body).operationId).toBe(before);
  });

  it("accepts a lost response only when an authoritative read confirms the write", async () => {
    const f = vi.fn().mockRejectedValue(new TypeError("lost"));
    vi.stubGlobal("fetch", f);
    const recover = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    const response = await fetchIdempotentWrite("/api/qa/confirmed", init, {
      recover,
    });
    expect(response.ok).toBe(true);
    expect(f).toHaveBeenCalledTimes(1);
    expect(recover).toHaveBeenCalledTimes(1);
    expect(
      sessionStorage.getItem("pending-write:/api/qa/confirmed"),
    ).toBeNull();
  });

  it("keeps SERVICE creation stable until chat initialization has also completed", async () => {
    const f = vi.fn().mockImplementation(created);
    vi.stubGlobal("fetch", f);
    await fetchIdempotentWrite("/api/qa/chain", init, {
      retainUntilComplete: true,
    });
    await fetchIdempotentWrite("/api/qa/chain", init, {
      retainUntilComplete: true,
    });
    expect(JSON.parse(f.mock.calls[0][1].body).operationId).toBe(
      JSON.parse(f.mock.calls[1][1].body).operationId,
    );
    completeWriteIntent("/api/qa/chain", "request");
    await fetchIdempotentWrite("/api/qa/chain", init, {
      retainUntilComplete: true,
    });
    expect(JSON.parse(f.mock.calls[2][1].body).operationId).not.toBe(
      JSON.parse(f.mock.calls[1][1].body).operationId,
    );
  });
});
