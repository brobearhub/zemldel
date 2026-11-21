import { beforeEach, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const { session, backend } = vi.hoisted(() => ({
  session: vi.fn(),
  backend: vi.fn(),
}));

vi.mock("@/core/auth", () => ({ getServerAuthSession: session }));
vi.mock("@/shared/api/backend/server", () => ({
  fetchBackendAsUser: backend,
  fetchBackend: vi.fn(),
}));

const url = "http://localhost/api/lands/address-suggestions";
const context = { params: Promise.resolve({ path: ["address-suggestions"] }) };
const body = JSON.stringify({ query: "екат тбил" });
const post = () => POST(new Request(url, { method: "POST", body }), context);

beforeEach(() => {
  session.mockReset();
  backend.mockReset();
});

it("passes the typed address to Nest using the signed-in user's identity", async () => {
  session.mockResolvedValue({ user: { id: "author" } });
  const addresses = ["г Екатеринбург, Тбилисский б-р"];
  backend.mockResolvedValue(Response.json(addresses));
  const response = await post();
  expect(backend).toHaveBeenCalledWith(
    "/lands/address-suggestions",
    "author",
    expect.objectContaining({ method: "POST", body }),
  );
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(await response.json()).toEqual(addresses);
});

it("requires a session and accepts only POST", async () => {
  session.mockResolvedValue(null);
  expect((await post()).status).toBe(401);
  expect((await GET(new Request(url), context)).status).toBe(405);
  expect(backend).not.toHaveBeenCalled();
});

it("forwards confirmed cadastral numbers only for signed-in authors using POST", async () => {
  const lookup = new Request("http://localhost/api/lands/cadastral-location", {
    method: "POST",
    body: JSON.stringify({ cadastralNumber: "77:02:0004008:4143" }),
  });
  const route = { params: Promise.resolve({ path: ["cadastral-location"] }) };
  expect((await GET(new Request(lookup.url), route)).status).toBe(405);
  session.mockResolvedValue(null);
  expect((await POST(lookup.clone(), route)).status).toBe(401);
  expect(backend).not.toHaveBeenCalled();
  session.mockResolvedValue({ user: { id: "author" } });
  backend.mockResolvedValue(Response.json({ status: "not_found" }));
  expect(await (await POST(lookup.clone(), route)).json()).toEqual({ status: "not_found" });
  expect(backend).toHaveBeenCalledWith("/lands/cadastral-location", "author", expect.objectContaining({
    method: "POST",
    body: await lookup.text(),
  }));
});
