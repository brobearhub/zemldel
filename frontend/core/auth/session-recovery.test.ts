import { describe, expect, it } from "vitest";
import {
  buildSignInHref,
  createSessionRecoveryFetch,
  isSafeReturnToPath,
  isSessionRecoveryUrl,
  nextRecoveryStep,
  SESSION_RECOVERY_ATTEMPTS,
} from "./session-recovery";

const noPause = async () => {};

describe("isSafeReturnToPath", () => {
  it("принимает внутренний путь", () => {
    expect(isSafeReturnToPath("/pro")).toBe(true);
    expect(isSafeReturnToPath("/pro/requests/1?tab=new")).toBe(true);
  });

  it("отклоняет внешний адрес", () => {
    expect(isSafeReturnToPath(null)).toBe(false);
    expect(isSafeReturnToPath("https://evil.test")).toBe(false);
    expect(isSafeReturnToPath("//evil.test")).toBe(false);
    expect(isSafeReturnToPath("/foo/https://evil.test")).toBe(false);
  });
});

describe("buildSignInHref", () => {
  it("кладёт путь возврата в query", () => {
    expect(buildSignInHref("/pro/requests/1")).toBe(
      `/signin?returnTo=${encodeURIComponent("/pro/requests/1")}`,
    );
  });

  it("подставляет корень, если путь небезопасный", () => {
    expect(buildSignInHref("https://evil.test")).toBe(`/signin?returnTo=${encodeURIComponent("/")}`);
  });
});

describe("isSessionRecoveryUrl", () => {
  it("берёт свои api-запросы и пропускает вход и чужой хост", () => {
    expect(isSessionRecoveryUrl("/api/pro/requests/feed")).toBe(true);
    expect(isSessionRecoveryUrl("http://localhost:4000/api/pro/requests/feed", "http://localhost:4000")).toBe(true);
    expect(isSessionRecoveryUrl("/api/auth/session")).toBe(false);
    expect(isSessionRecoveryUrl("/api/auth/signin")).toBe(false);
    expect(isSessionRecoveryUrl("https://other.test/api/x", "http://localhost:4000")).toBe(false);
    expect(isSessionRecoveryUrl("/pro")).toBe(false);
  });
});

describe("nextRecoveryStep", () => {
  it("повторяет, пока попытки не кончились", () => {
    expect(nextRecoveryStep(0, "/pro")).toBe("refresh");
    expect(nextRecoveryStep(SESSION_RECOVERY_ATTEMPTS - 1, "/pro")).toBe("refresh");
  });

  it("после лимита уводит на вход", () => {
    expect(nextRecoveryStep(SESSION_RECOVERY_ATTEMPTS, "/pro")).toBe("redirect");
  });

  it("со страниц входа и регистрации не уводит повторно", () => {
    expect(nextRecoveryStep(SESSION_RECOVERY_ATTEMPTS, "/signin")).toBe("surface");
    expect(nextRecoveryStep(SESSION_RECOVERY_ATTEMPTS, "/signup")).toBe("surface");
  });
});

describe("createSessionRecoveryFetch", () => {
  it("три раза обновляет сессию и затем открывает вход с возвратом", async () => {
    let calls = 0;
    let sessions = 0;
    const redirects: string[] = [];
    const recovered = createSessionRecoveryFetch({
      fetch: async () => {
        calls += 1;
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      },
      getSession: async () => {
        sessions += 1;
        return null;
      },
      pathname: () => "/pro",
      returnTo: () => "/pro?tab=1",
      origin: () => "http://localhost:4000",
      redirect: (href) => {
        redirects.push(href);
      },
      pause: noPause,
    });

    const response = await recovered("/api/pro/requests/feed");

    expect(response.status).toBe(401);
    expect(calls).toBe(1 + SESSION_RECOVERY_ATTEMPTS);
    expect(sessions).toBe(SESSION_RECOVERY_ATTEMPTS);
    expect(redirects).toEqual([`/signin?returnTo=${encodeURIComponent("/pro?tab=1")}`]);
  });

  it("после успешного повтора отдаёт ответ и начинает счётчик заново", async () => {
    let calls = 0;
    const recovered = createSessionRecoveryFetch({
      fetch: async () => {
        calls += 1;
        if (calls === 1 || calls === 3) {
          return new Response("no", { status: 401 });
        }
        return new Response("ok", { status: 200 });
      },
      getSession: async () => ({ user: { id: "user-1" } }),
      pathname: () => "/pro",
      returnTo: () => "/pro",
      origin: () => "http://localhost:4000",
      redirect: () => {
        throw new Error("redirect");
      },
      pause: noPause,
    });

    const first = await recovered("/api/pro/requests/feed");
    expect(first.status).toBe(200);
    expect(calls).toBe(2);

    const second = await recovered("/api/pro/requests/feed");
    expect(second.status).toBe(200);
    expect(calls).toBe(4);
  });

  it("не трогает запросы входа", async () => {
    let sessions = 0;
    const recovered = createSessionRecoveryFetch({
      fetch: async () => new Response("no", { status: 401 }),
      getSession: async () => {
        sessions += 1;
        return null;
      },
      pathname: () => "/signin",
      returnTo: () => "/signin",
      origin: () => "http://localhost:4000",
      redirect: () => {
        throw new Error("redirect");
      },
      pause: noPause,
    });

    const response = await recovered("/api/auth/signin", { method: "POST" });
    expect(response.status).toBe(401);
    expect(sessions).toBe(0);
  });

  it("делит одно обновление между параллельными 401", async () => {
    let sessions = 0;
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const recovered = createSessionRecoveryFetch({
      fetch: async () => new Response("no", { status: 401 }),
      getSession: async () => {
        sessions += 1;
        if (sessions === 1) await gate;
        return null;
      },
      pathname: () => "/pro",
      returnTo: () => "/pro",
      origin: () => "http://localhost:4000",
      redirect: () => {},
      pause: noPause,
    });

    const first = recovered("/api/a");
    const second = recovered("/api/b");
    await Promise.resolve();
    await Promise.resolve();
    expect(sessions).toBe(1);
    release();
    await Promise.all([first, second]);
    expect(sessions).toBe(SESSION_RECOVERY_ATTEMPTS);
  });
});
