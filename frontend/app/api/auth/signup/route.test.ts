/** @vitest-environment node */
import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { fetchBackend } from "@/shared/api/backend/server";
import { POST as complete } from "./route";
import { POST as verify } from "./verify/route";

vi.mock("@/shared/api/backend/server", () => ({ fetchBackend: vi.fn() }));

const email = "person@example.test";
const token = "one-time-registration-proof";
const fields = {
  email, password: "test-password", accountKind: "PROVIDER",
  acceptedLegal: { terms: "2026-11-21", privacy: "2026-11-21", consent: "2026-11-21" },
};

function post(body: unknown, cookie = "") {
  return new NextRequest("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.resetAllMocks());

it("keeps the proof for new registrations in an HttpOnly cookie and consumes it on completion", async () => {
  vi.mocked(fetchBackend).mockResolvedValueOnce(Response.json({
    status: "registration_required", email, accountKind: null, registrationToken: token,
  }));
  const checked = await verify(post({ email, code: "0123" }));
  expect(await checked.json()).toEqual({ status: "registration_required", email, accountKind: null });
  expect(checked.cookies.get("signup-proof")).toMatchObject({
    value: token, httpOnly: true, sameSite: "strict", path: "/api/auth/signup",
  });

  vi.mocked(fetchBackend).mockResolvedValueOnce(Response.json({ id: "created" }, { status: 201 }));
  const result = await complete(post(fields, `signup-proof=${token}`));
  expect(result.status).toBe(201);
  expect(JSON.parse(String(vi.mocked(fetchBackend).mock.calls[1][1]?.body))).toEqual({
    ...fields, registrationToken: token,
  });
  expect(result.cookies.get("signup-proof")?.maxAge).toBe(0);
});

it("requires a verified cookie and preserves the password step for an existing account", async () => {
  expect((await complete(post({ ...fields, registrationToken: token }))).status).toBe(403);
  expect(fetchBackend).not.toHaveBeenCalled();
  vi.mocked(fetchBackend).mockResolvedValueOnce(Response.json({ status: "password_required", email }));
  const checked = await verify(post({ email, code: "0123" }));
  expect(await checked.json()).toEqual({ status: "password_required", email });
  expect(checked.headers.has("set-cookie")).toBe(false);
});
