import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";

const { session, backend } = vi.hoisted(() => ({
  session: vi.fn(),
  backend: vi.fn(),
}));

vi.mock("@/core/auth", () => ({ getServerAuthSession: session }));
vi.mock("@/shared/api/backend/server", () => ({ fetchBackendAsUser: backend }));

const id = "00000000-0000-4000-8000-000000000001";
const request = (cityId = id) => new Request(`http://localhost/api/lands/city-center?cityId=${cityId}`);

beforeEach(() => {
  backend.mockReset();
  session.mockReset().mockResolvedValue({ user: { id: "author" } });
});

it.each([{ latitude: 56.8, longitude: 60.6 }, null])("returns the selected city's center or null", async (point) => {
  backend.mockResolvedValue(Response.json({ point }));
  const req = request();
  const result = await GET(req);
  expect(backend).toHaveBeenCalledWith(`/lands/city-center?cityId=${id}`, "author", { signal: req.signal });
  expect(result.headers.get("cache-control")).toContain("no-store");
  expect(await result.json()).toEqual(point);
});

it("checks the city ID and the session before calling the backend", async () => {
  expect((await GET(request("wrong-id"))).status).toBe(400);
  session.mockResolvedValue(null);
  expect((await GET(request())).status).toBe(401);
  expect(backend).not.toHaveBeenCalled();
});
