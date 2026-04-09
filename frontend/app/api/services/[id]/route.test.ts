/** @jest-environment node */

import type { NextRequest } from "next/server";
import { GET } from "./route";

jest.mock("@/lib/backend-api", () => ({
  __esModule: true,
  fetchBackend: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  __esModule: true,
  getServerAuthSession: jest.fn(),
}));

import { fetchBackend } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import { mainService } from "@/tests/fixtures/services";

const mockedFetchBackend = fetchBackend as jest.Mock;
const mockedGetServerAuthSession = getServerAuthSession as jest.Mock;

describe("GET /api/services/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerAuthSession.mockResolvedValue(null);
  });

  it("returns service by id", async () => {
    const row = { ...mainService, id: "svc-1" };
    mockedFetchBackend.mockResolvedValue(
      new Response(JSON.stringify(row), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "svc-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual(row);
    expect(mockedFetchBackend).toHaveBeenCalledWith("/services/svc-1");
  });

  it("returns 404 when service is missing", async () => {
    mockedFetchBackend.mockResolvedValue(
      new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    );

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "missing" }),
    });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json).toEqual({ error: "Not found" });
  });

  it("returns 500 when repository throws", async () => {
    mockedFetchBackend.mockRejectedValue(new Error("backend error"));

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "svc-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toEqual({ error: "Failed to fetch service" });
  });

});
