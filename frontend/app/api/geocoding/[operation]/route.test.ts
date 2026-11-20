import { beforeEach, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const { session, backend } = vi.hoisted(() => ({ session: vi.fn(), backend: vi.fn() }));
vi.mock("@/core/auth", () => ({ getServerAuthSession: session }));
vi.mock("@/shared/api/backend/server", () => ({ fetchBackendAsUser: backend }));

const operations = [
  ["address-suggestions", "POST", { query: "Тбил" }],
  ["resolve-address", "POST", { reference: { source: "test", key: "a", text: "улица" } }],
  ["city-center", "GET", undefined],
  ["cadastral-location", "POST", { cadastralNumber: "77:02:0004008:4143" }],
] as const;

beforeEach(() => {
  backend.mockReset();
  session.mockReset();
});

it.each(operations)(
  "forwards %s only for an authenticated user with the required method",
  async (operation, method, payload) => {
    const query = method === "GET" ? "?cityId=selected" : "";
    const url = "http://localhost/api/geocoding/" + operation + query;
    const context = { params: Promise.resolve({ operation }) };
    const body = payload && JSON.stringify(payload);
    const call = () => (method === "GET" ? GET : POST)(new Request(url, { method, body }), context);
    expect((await call()).status).toBe(401);
    expect(
      (await POST(new Request(url, { method: method === "GET" ? "POST" : "GET" }), context)).status,
    ).toBe(405);
    expect(backend).not.toHaveBeenCalled();

    session.mockResolvedValue({ user: { id: "author" } });
    backend.mockResolvedValue(Response.json({ point: null }));
    const response = await call();
    expect(backend).toHaveBeenCalledWith(
      `/geocoding/${operation}${query}`,
      "author",
      expect.objectContaining({
        method,
        ...(body && { body }),
        signal: expect.anything(),
      }),
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({ point: null });
  },
);

it("rejects unregistered operations before accessing the backend", async () => {
  const response = await GET(new Request("http://localhost/api/geocoding/other"), {
    params: Promise.resolve({ operation: "other" }),
  });
  expect(response.status).toBe(404);
  expect(backend).not.toHaveBeenCalled();
});
