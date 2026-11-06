/** @vitest-environment node */
import { GET } from "./route";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

vi.mock("@/shared/api/backend/server", () => ({ fetchBackendAsUser: vi.fn() }));
vi.mock("@/core/auth", () => ({ getServerAuthSession: vi.fn() }));

const backend = vi.mocked(fetchBackendAsUser);

describe("GET /api/documents/passport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerAuthSession).mockResolvedValue({ user: { id: "test-user" } } as never);
  });

  it("normalizes an empty successful backend response to no saved passport", async () => {
    backend.mockResolvedValue(new Response(null, { status: 200 }));
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });

  it("normalizes no-content to a JSON response", async () => {
    backend.mockResolvedValue(new Response(null, { status: 204 }));
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });

  it("preserves a saved passport response", async () => {
    const passport = { series: "1234", number: "567890" };
    backend.mockResolvedValue(Response.json(passport));
    const response = await GET();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual(passport);
  });

  it("does not treat a failed empty response as an absent passport", async () => {
    backend.mockResolvedValue(new Response(null, { status: 503 }));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Не удалось загрузить анкету" });
  });

  it("rejects malformed non-empty success instead of allowing a new form", async () => {
    backend.mockResolvedValue(new Response("invalid-json", { status: 200 }));
    expect((await GET()).status).toBe(502);
  });

  it("requires a signed-in user", async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect(backend).not.toHaveBeenCalled();
  });
});
