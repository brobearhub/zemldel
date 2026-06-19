/** @vitest-environment node */

import type { NextRequest } from "next/server";
import { DELETE, PATCH } from "./route";

vi.mock("@/core/auth/next-auth", () => ({
  __esModule: true,
  getServerAuthSession: vi.fn(),
}));

vi.mock("@/shared/api/backend/server", () => ({
  __esModule: true,
  fetchBackendAsUser: vi.fn(),
}));

import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth/next-auth";
import { mainService } from "@/tests/fixtures/services";

const mockedFetchBackendAsUser = vi.mocked(fetchBackendAsUser);
const mockedGetServerAuthSession = vi.mocked(getServerAuthSession);

function setNodeEnv(value: "development" | "production" | "test") {
  process.env = { ...process.env, NODE_ENV: value } as NodeJS.ProcessEnv;
}

const originalNodeEnv = process.env.NODE_ENV;

describe("Admin services API /api/admin/services/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setNodeEnv("test");
    mockedGetServerAuthSession.mockResolvedValue({
      user: {
        id: "user-1",
        systemRole: "PLATFORM_ADMIN",
      },
    });
  });

  afterAll(() => {
    setNodeEnv((originalNodeEnv as "development" | "production" | "test" | undefined) ?? "test");
  });

  it("returns 403 when user is not PLATFORM_ADMIN for PATCH", async () => {
    mockedGetServerAuthSession.mockResolvedValue({
      user: {
        id: "user-1",
        systemRole: "CUSTOMER",
      },
    });

    const request = new Request("http://localhost/api/admin/services/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New title" }),
    }) as unknown as NextRequest;

    const response = (await PATCH(request, { params: Promise.resolve({ id: "1" }) }))!;
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json).toEqual({ error: "Forbidden" });
    expect(mockedFetchBackendAsUser).not.toHaveBeenCalled();
  });

  it("returns 401 when session is missing for PATCH", async () => {
    mockedGetServerAuthSession.mockResolvedValue(null);

    const request = new Request("http://localhost/api/admin/services/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated" }),
    }) as unknown as NextRequest;

    const response = (await PATCH(request, { params: Promise.resolve({ id: "1" }) }))!;
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ error: "Unauthorized" });
  });

  it("proxies PATCH payload to backend", async () => {
    mockedFetchBackendAsUser.mockResolvedValue(
      new Response(
        JSON.stringify({
          ...mainService,
          id: "1",
          title: "Updated",
          category: "legal",
          ctaHref: null,
          image: null,
          rating: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const payload = {
      category: "legal",
      title: "Updated",
      ctaHref: null,
      image: null,
      rating: null,
    };

    const request = new Request("http://localhost/api/admin/services/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }) as unknown as NextRequest;

    const response = (await PATCH(request, { params: Promise.resolve({ id: "1" }) }))!;
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual(expect.objectContaining({ id: "1", title: "Updated" }));
    expect(mockedFetchBackendAsUser).toHaveBeenCalledWith("/admin/services/1", "user-1", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  });

  it("returns 500 when PATCH fails", async () => {
    mockedFetchBackendAsUser.mockRejectedValue(new Error("backend error"));

    const request = new Request("http://localhost/api/admin/services/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated" }),
    }) as unknown as NextRequest;

    const response = (await PATCH(request, { params: Promise.resolve({ id: "1" }) }))!;
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toEqual({ error: "Failed to update service" });
  });

  it("deletes service in DELETE", async () => {
    mockedFetchBackendAsUser.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const response = (await DELETE({} as NextRequest, { params: Promise.resolve({ id: "1" }) }))!;
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(mockedFetchBackendAsUser).toHaveBeenCalledWith("/admin/services/1", "user-1", {
      method: "DELETE",
    });
  });

  it("returns 403 when user is not PLATFORM_ADMIN for DELETE", async () => {
    mockedGetServerAuthSession.mockResolvedValue({
      user: {
        id: "user-1",
        systemRole: "CUSTOMER",
      },
    });

    const response = (await DELETE({} as NextRequest, { params: Promise.resolve({ id: "1" }) }))!;
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json).toEqual({ error: "Forbidden" });
  });
});
