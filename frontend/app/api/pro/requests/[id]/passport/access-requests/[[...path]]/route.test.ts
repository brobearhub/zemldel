import { GET, POST } from "./route";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
vi.mock("@/core/auth", () => ({getServerAuthSession: vi.fn()}));
vi.mock("@/shared/api/backend/server", () => ({fetchBackendAsUser: vi.fn()}));
const context = (path?: string[]) => ({params: Promise.resolve({id:"request-1",path})});
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getServerAuthSession).mockResolvedValue({user:{id:"provider-user"}} as never);
});
it("requires a session before listing or requesting access", async () => {
  vi.mocked(getServerAuthSession).mockResolvedValue(null);
  expect((await GET(new Request("http://localhost/api"),context())).status).toBe(401);
  expect((await POST(new Request("http://localhost/api",{method:"POST"}),context(["FORM"]))).status).toBe(401);
  expect(fetchBackendAsUser).not.toHaveBeenCalled();
});
it("forwards independent kinds as the session actor and preserves backend failures", async () => {
  vi.mocked(fetchBackendAsUser).mockResolvedValue(Response.json({requested:true}));
  const response = await POST(new Request("http://localhost/api",{method:"POST"}),context(["PHOTO"]));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(fetchBackendAsUser).toHaveBeenCalledWith("/pro/requests/request-1/passport/access-requests/PHOTO","provider-user",expect.objectContaining({method:"POST",cache:"no-store"}));
  vi.mocked(fetchBackendAsUser).mockResolvedValue(Response.json({message:"Denied"},{status:403}));
  expect((await GET(new Request("http://localhost/api"),context())).status).toBe(403);
  expect((await POST(new Request("http://localhost/api",{method:"POST"}),context(["UNKNOWN"]))).status).toBe(404);
});
