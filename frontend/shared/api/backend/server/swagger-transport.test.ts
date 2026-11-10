import { beforeEach, describe, expect, it, vi } from "vitest";
import { backendSwaggerFetch } from "./swagger-transport";
import { DELETE, PATCH, POST } from "@/app/api/messengers/[[...path]]/route";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/shared/api/generated/backend/Api", () => ({
  HttpClient: class {
    request = request;
  },
}));
vi.mock("./internal-auth", () => ({
  createInternalAuthTokenForUserId: () => "test-only",
}));
vi.mock("@/core/auth", () => ({
  getServerAuthSession: async () => ({ user: { id: "test-user" } }),
}));

beforeEach(() => { request.mockReset(); });

describe("backend responses without a body", () => {
  it.each([204, 205, 304])(
    "preserves HTTP %s without constructing an illegal response body",
    async (status) => {
      request.mockResolvedValue({
        status,
        headers: {},
        data: new ArrayBuffer(0),
      });
      const response = await backendSwaggerFetch({ path: "/test" });
      expect(response.status).toBe(status);
      expect(response.body).toBeNull();
      expect(await response.text()).toBe("");
    },
  );

  it("preserves JSON responses and HTTP errors", async () => {
    request.mockResolvedValue({
      status: 409,
      headers: { "content-type": "application/json" },
      data: new TextEncoder().encode('{"message":"Conflict"}'),
    });
    const response = await backendSwaggerFetch({ path: "/test" });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ message: "Conflict" });
  });

  it.each([
    { handler: DELETE, method: "DELETE", path: ["TELEGRAM"] },
    { handler: PATCH, method: "PATCH", path: ["TELEGRAM", "notifications"] },
    { handler: POST, method: "POST", path: ["TELEGRAM", "confirm"] },
  ])(
    "returns successful $method $path through the real transport and messenger BFF",
    async ({ handler, method, path }) => {
      request.mockResolvedValue({
        status: 204,
        headers: {},
        data: new ArrayBuffer(0),
      });
      const response = await handler(
        new Request(`http://localhost/api/messengers/${path.join("/")}`, {
          method,
        }),
        { params: Promise.resolve({ path }) },
      );
      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
    },
  );

  it("still reports a real transport failure", async () => {
    request.mockRejectedValue(new Error("connection failed"));
    const response = await DELETE(
      new Request("http://localhost/api/messengers/MAX", { method: "DELETE" }),
      { params: Promise.resolve({ path: ["MAX"] }) },
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      message:
        "Не удалось получить ответ сервера. Обновите статус подключения.",
    });
  });
});
