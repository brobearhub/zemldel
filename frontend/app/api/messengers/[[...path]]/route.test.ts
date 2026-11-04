import { describe, expect, it, vi } from "vitest";
import { POST, GET } from "./route";
vi.mock("@/core/auth", () => ({ getServerAuthSession: vi.fn().mockResolvedValue(null) }));
vi.mock("@/shared/api/backend/server", () => ({ fetchBackendAsUser: vi.fn() }));

describe("messenger BFF boundaries", () => {
  it("does not expose bot webhooks through the authenticated proxy", async () => {
    const response = await POST(new Request("http://localhost/api/messengers/TELEGRAM/webhook", { method: "POST" }), { params: Promise.resolve({ path: ["TELEGRAM", "webhook"] }) });
    expect(response.status).toBe(404);
  });
  it("requires a session and rejects cross-origin mutations", async () => {
    expect((await GET(new Request("http://localhost/api/messengers"), { params: Promise.resolve({}) })).status).toBe(401);
    const response = await POST(new Request("http://localhost/api/messengers/MAX/link", { method: "POST", headers: { Origin: "https://other.example" } }), { params: Promise.resolve({ path: ["MAX", "link"] }) });
    expect(response.status).toBe(403);
  });
});
