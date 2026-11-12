import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH, POST } from "./route";

const { getSession, fetchBackend } = vi.hoisted(() => ({
  getSession: vi.fn(),
  fetchBackend: vi.fn(),
}));

vi.mock("@/core/auth", () => ({ getServerAuthSession: getSession }));
vi.mock("@/shared/api/backend/server", () => ({
  fetchBackendAsUser: fetchBackend,
}));

const context = (path: string[] = []) => ({
  params: Promise.resolve({ path }),
});

beforeEach(() => {
  vi.stubEnv("NEXTAUTH_URL", "https://zemledel.ru/");
  getSession.mockReset().mockResolvedValue(null);
  fetchBackend.mockReset();
});

afterEach(() => vi.unstubAllEnvs());

describe("messenger BFF boundaries", () => {
  it("reads each session's own status and forbids caching private connection state", async () => {
    const saved = [{ platform: "MAX", connected: true, displayName: "Pavel" }];
    getSession.mockResolvedValueOnce({ user: { id: "user-1" } })
      .mockResolvedValueOnce({ user: { id: "user-2" } });
    fetchBackend.mockResolvedValueOnce(Response.json(saved))
      .mockResolvedValueOnce(Response.json([]));
    const first = await GET(new Request("http://localhost/api/messengers"), context());
    const second = await GET(new Request("http://localhost/api/messengers"), context());
    expect(await first.json()).toEqual(saved);
    expect(await second.json()).toEqual([]);
    expect(first.headers.get("cache-control")).toBe("private, no-store");
    expect(second.headers.get("cache-control")).toBe("private, no-store");
    expect(fetchBackend).toHaveBeenNthCalledWith(1, "/messengers", "user-1", expect.any(Object));
    expect(fetchBackend).toHaveBeenNthCalledWith(2, "/messengers", "user-2", expect.any(Object));
  });

  it("does not expose bot webhooks through the authenticated proxy", async () => {
    const response = await POST(
      new Request("http://localhost/api/messengers/TELEGRAM/webhook", {
        method: "POST",
      }),
      context(["TELEGRAM", "webhook"]),
    );
    expect(response.status).toBe(404);
    expect(fetchBackend).not.toHaveBeenCalled();
  });

  it("requires a session for status requests", async () => {
    const response = await GET(
      new Request("http://localhost/api/messengers"),
      context(),
    );
    expect(response.status).toBe(401);
  });

  it.each([
    { handler: POST, method: "POST", path: ["TELEGRAM", "link"] },
    { handler: POST, method: "POST", path: ["MAX", "link"] },
    { handler: POST, method: "POST", path: ["MAX", "confirm"] },
    { handler: PATCH, method: "PATCH", path: ["TELEGRAM", "notifications"] },
    { handler: DELETE, method: "DELETE", path: ["MAX"] },
  ])(
    "allows public-origin $method $path behind an HTTP proxy",
    async ({ handler, method, path }) => {
      getSession.mockResolvedValue({ user: { id: "user-1" } });
      fetchBackend.mockResolvedValue(new Response(null, { status: 204 }));
      const response = await handler(
        new Request(`http://0.0.0.0:3000/api/messengers/${path.join("/")}`, {
          method,
          headers: { Origin: "https://zemledel.ru" },
        }),
        context(path),
      );
      expect(response.status).toBe(204);
      expect(fetchBackend).toHaveBeenCalledWith(
        `/messengers/${path.join("/")}`,
        "user-1",
        expect.objectContaining({ method }),
      );
    },
  );

  it.each([
    "https://other.example",
    "https://zemledel.ru.attacker.example",
    "http://zemledel.ru",
    "null",
  ])(
    "rejects untrusted origin %s even with matching forwarded headers",
    async (origin) => {
      getSession.mockResolvedValue({ user: { id: "user-1" } });
      const response = await POST(
        new Request("http://0.0.0.0:3000/api/messengers/MAX/link", {
          method: "POST",
          headers: {
            Origin: origin,
            "x-forwarded-host": origin.replace(/^https?:\/\//, ""),
            "x-forwarded-proto": "https",
          },
        }),
        context(["MAX", "link"]),
      );
      expect(response.status).toBe(403);
      expect(getSession).not.toHaveBeenCalled();
      expect(fetchBackend).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, "https://zemledel.ru"])(
    "still requires a session with origin %s",
    async (origin) => {
      const response = await POST(
        new Request("http://0.0.0.0:3000/api/messengers/MAX/link", {
          method: "POST",
          headers: origin ? { Origin: origin } : {},
        }),
        context(["MAX", "link"]),
      );
      expect(response.status).toBe(401);
      expect(fetchBackend).not.toHaveBeenCalled();
    },
  );

  it("uses the request origin locally without NEXTAUTH_URL", async () => {
    vi.stubEnv("NEXTAUTH_URL", undefined);
    const response = await POST(
      new Request("http://localhost:4000/api/messengers/MAX/link", {
        method: "POST",
        headers: { Origin: "http://localhost:4000" },
      }),
      context(["MAX", "link"]),
    );
    expect(response.status).toBe(401);
  });

  it("rejects mutations if the configured public URL is invalid", async () => {
    vi.stubEnv("NEXTAUTH_URL", "invalid-url");
    const response = await POST(
      new Request("http://localhost/api/messengers/MAX/link", {
        method: "POST",
        headers: { Origin: "http://localhost" },
      }),
      context(["MAX", "link"]),
    );
    expect(response.status).toBe(403);
    expect(fetchBackend).not.toHaveBeenCalled();
  });
});
