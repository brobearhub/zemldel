/** @vitest-environment node */
import { expect, it, vi } from "vitest";
import { fetchBackendAsUser } from "./backend-fetch";
import {
  POST as invite,
  DELETE as revoke,
} from "@/app/api/pro/clients/[[...path]]/route";
import { GET as history } from "@/app/api/pro/requests/[id]/provider-work/route";

vi.mock("@/core/auth", () => ({
  getServerAuthSession: () =>
    Promise.resolve({ user: { id: "provider-user" } }),
}));
vi.mock("./backend-fetch", () => ({ fetchBackendAsUser: vi.fn() }));

it.each(["POST", "DELETE"])(
  "forwards an invitation %s without a serialized empty JSON string",
  async (method) => {
    vi.mocked(fetchBackendAsUser).mockResolvedValueOnce(
      Response.json({ ok: true }),
    );
    const id = "22222222-2222-4222-8222-222222222222";
    const path = `/pro/clients/${id}/invitation`;
    const route = method === "POST" ? invite : revoke;
    const response = await route(
      new Request("http://localhost/api" + path, { method }),
      { params: Promise.resolve({ path: [id, "invitation"] }) },
    );
    expect(response.ok).toBe(true);
    expect(fetchBackendAsUser).toHaveBeenLastCalledWith(path, "provider-user", {
      method,
      cache: "no-store",
    });
  },
);

it("reads the provider's work history through the exported route", async () => {
  const events = [{ id: "new", status: "PLANNED" }];
  vi.mocked(fetchBackendAsUser).mockResolvedValueOnce(
    Response.json({ events }),
  );
  const path = "/pro/requests/own-request/provider-work";
  const response = await history(new Request("http://localhost/api" + path), {
    params: Promise.resolve({ id: "own-request" }),
  });
  expect(await response.json()).toEqual({ events });
  expect(fetchBackendAsUser).toHaveBeenLastCalledWith(path, "provider-user", {
    method: "GET",
    cache: "no-store",
  });
});
