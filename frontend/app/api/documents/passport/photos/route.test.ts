/** @vitest-environment node */
import { GET, POST } from "./route";
import { GET as image } from "./[id]/route";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
vi.mock("@/shared/api/backend/server", () => ({ fetchBackendAsUser: vi.fn() }));
vi.mock("@/core/auth", () => ({ getServerAuthSession: vi.fn() }));
describe("passport photo proxy", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(getServerAuthSession).mockResolvedValue({ user: { id: "owner" } } as never); });
  it("requires a session before reading or forwarding photos", async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await POST(new Request("http://localhost/api", { method: "POST" }))).status).toBe(401);
    expect(fetchBackendAsUser).not.toHaveBeenCalled();
  });
  it("returns an uncached list scoped to the session owner", async () => {
    vi.mocked(fetchBackendAsUser).mockResolvedValue(Response.json([]));
    const response = await GET();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(fetchBackendAsUser).toHaveBeenCalledWith("/documents/passport/photos/mine", "owner", { cache: "no-store" });
  });
  it("proxies image bytes without public caching or redirects", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    vi.mocked(fetchBackendAsUser).mockResolvedValue(new Response(bytes, { headers: { "content-type": "image/png" } }));
    const response = await image(new Request("http://localhost/api"), { params: Promise.resolve({ id: "photo" }) });
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
  it("does not serve HTML returned in place of an image", async () => {
    vi.mocked(fetchBackendAsUser).mockResolvedValue(new Response("<html/>", { headers: { "content-type": "text/html" } }));
    expect((await image(new Request("http://localhost/api"), { params: Promise.resolve({ id: "photo" }) })).status).toBe(502);
  });
});
