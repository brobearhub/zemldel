import { describe, expect, it } from "vitest";
import { refreshAuthToken } from "./refresh-auth-context";

describe("refreshAuthToken", () => {
  it("записывает контекст, когда он пришёл", async () => {
    const token: { sub?: string; id?: string } = { sub: "user-1" };
    const next = await refreshAuthToken(
      token,
      async () => ({ id: "user-1" }),
      (current, user) => {
        current.id = (user as { id: string }).id;
      },
    );
    expect(next.id).toBe("user-1");
  });

  it("не подменяет токен, если контекст ответил 401", async () => {
    const token = { sub: "user-1", id: "user-1" };
    const next = await refreshAuthToken(
      token,
      async () => null,
      () => {
        throw new Error("assign");
      },
    );
    expect(next).toEqual({ sub: "user-1", id: "user-1" });
  });

  it("оставляет токен при временной ошибке контекста", async () => {
    const token = { sub: "user-1", id: "user-1" };
    const next = await refreshAuthToken(
      token,
      async () => {
        throw new Error("timeout");
      },
      () => {
        throw new Error("assign");
      },
    );
    expect(next).toEqual({ sub: "user-1", id: "user-1" });
  });
});
