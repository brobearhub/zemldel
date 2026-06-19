/** @vitest-environment node */

import type { NextRequest } from "next/server";
import { GET, POST } from "./route";

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

describe("Admin services API /api/admin/services", () => {
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

  it("returns 403 when user is not PLATFORM_ADMIN for GET", async () => {
    mockedGetServerAuthSession.mockResolvedValue({
      user: {
        id: "user-1",
        systemRole: "CUSTOMER",
      },
    });

    const response = (await GET({} as NextRequest))!;
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json).toEqual({ error: "Forbidden" });
    expect(mockedFetchBackendAsUser).not.toHaveBeenCalled();
  });

  it("returns services for GET when platform admin", async () => {
    const rows = [{ ...mainService, id: "svc-1" }];
    mockedFetchBackendAsUser.mockResolvedValue(
      new Response(JSON.stringify(rows), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const response = (await GET({} as NextRequest))!;
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual(rows);
    expect(mockedFetchBackendAsUser).toHaveBeenCalledWith("/admin/services", "user-1");
  });

  it("returns 403 when user is not PLATFORM_ADMIN for POST", async () => {
    mockedGetServerAuthSession.mockResolvedValue({
      user: {
        id: "user-1",
        systemRole: "CUSTOMER",
      },
    });

    const request = new Request("http://localhost/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }) as unknown as NextRequest;
    const response = (await POST(request))!;
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json).toEqual({ error: "Forbidden" });
    expect(mockedFetchBackendAsUser).not.toHaveBeenCalled();
  });

  it("returns 401 when session is missing", async () => {
    mockedGetServerAuthSession.mockResolvedValue(null);

    const request = new Request("http://localhost/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "main" }),
    }) as unknown as NextRequest;

    const response = (await POST(request))!;
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ error: "Unauthorized" });
    expect(mockedFetchBackendAsUser).not.toHaveBeenCalled();
  });

  it("proxies POST payload to backend", async () => {
    mockedFetchBackendAsUser.mockResolvedValue(
      new Response(JSON.stringify({ ...mainService, id: "new-service" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );

    const payload = {
      category: "main",
      title: "  Test title ",
      price: " 1000 ₽ ",
      ctaText: " Записаться ",
      image: "/img.jpg",
      ctaHref: "/contacts",
    };

    const request = new Request("http://localhost/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }) as unknown as NextRequest;

    const response = (await POST(request))!;
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json).toEqual(expect.objectContaining({ id: "new-service" }));
    expect(mockedFetchBackendAsUser).toHaveBeenCalledWith("/admin/services", "user-1", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  });

  it("returns 500 when backend fetch throws", async () => {
    mockedFetchBackendAsUser.mockRejectedValue(new Error("backend error"));

    const request = new Request("http://localhost/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "main",
        title: "Service",
        price: "1000",
        ctaText: "CTA",
      }),
    }) as unknown as NextRequest;

    const response = (await POST(request))!;
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toEqual({ error: "Failed to create service" });
  });
});
