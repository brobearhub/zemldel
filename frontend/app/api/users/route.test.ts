/** @vitest-environment node */

import type { NextRequest } from "next/server";
import { GET, POST } from "./route";

vi.mock("@/shared/api/backend/server", () => ({
  __esModule: true,
  fetchBackend: vi.fn(),
}));

import { fetchBackend } from "@/shared/api/backend/server";

const mockedFetchBackend = vi.mocked(fetchBackend);

describe("Users API /api/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns users list in GET", async () => {
    const rows = [
      {
        id: "u1",
        email: "a@a.com",
        name: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ];
    mockedFetchBackend.mockResolvedValue(
      new Response(JSON.stringify(rows), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const response = await GET({} as NextRequest);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual([
      {
        ...rows[0],
        createdAt: rows[0].createdAt.toISOString(),
        updatedAt: rows[0].updatedAt.toISOString(),
      },
    ]);
    expect(mockedFetchBackend).toHaveBeenCalledWith("/users");
  });

  it("validates required email in POST", async () => {
    const request = new Request("http://localhost/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test" }),
    }) as unknown as NextRequest;

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "email is required" });
    expect(mockedFetchBackend).not.toHaveBeenCalled();
  });

  it("creates user in POST", async () => {
    const created = {
      id: "u1",
      email: "mail@test.com",
      name: "User",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    mockedFetchBackend.mockResolvedValue(
      new Response(JSON.stringify(created), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );

    const request = new Request("http://localhost/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "mail@test.com", name: "User" }),
    }) as unknown as NextRequest;

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json).toEqual({
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    });
    expect(mockedFetchBackend).toHaveBeenCalledWith("/users", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "mail@test.com",
        name: "User",
      }),
    });
  });

  it("returns 500 when GET fails", async () => {
    mockedFetchBackend.mockRejectedValue(new Error("backend down"));

    const response = await GET({} as NextRequest);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toEqual({ error: "Failed to fetch users" });
  });

  it("returns 500 when POST fails", async () => {
    mockedFetchBackend.mockRejectedValue(new Error("insert fail"));

    const request = new Request("http://localhost/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "mail@test.com" }),
    }) as unknown as NextRequest;

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toEqual({ error: "Failed to create user" });
  });
});
