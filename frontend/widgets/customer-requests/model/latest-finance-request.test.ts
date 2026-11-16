import { describe, expect, it } from "vitest";
import { createLatestFinanceRequestRunner } from "./latest-finance-request";

function deferred<T>() {
  let resolvePromise: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

describe("createLatestFinanceRequestRunner", () => {
  it("keeps B when late A resolves after B", async () => {
    const applied: string[] = [];
    const requestA = deferred<string>();
    const requestB = deferred<string>();
    const runner = createLatestFinanceRequestRunner<string>((value) => {
      applied.push(value);
    });

    const pendingA = runner.run("conversation-a", () => requestA.promise);
    const pendingB = runner.run("conversation-b", () => requestB.promise);
    requestB.resolve("finance-b");
    expect(await pendingB).toBe(true);
    requestA.resolve("finance-a");
    expect(await pendingA).toBe(false);

    expect(applied).toEqual(["finance-b"]);
    expect(runner.currentKey()).toBe("conversation-b");
  });

  it("reports that a cancelled response was not applied", async () => {
    const applied: string[] = [];
    const pending = deferred<string>();
    const runner = createLatestFinanceRequestRunner<string>((value) => {
      applied.push(value);
    });
    const result = runner.run("conversation-a", () => pending.promise);
    runner.cancel();
    pending.resolve("stale-finance");
    expect(await result).toBe(false);
    expect(applied).toEqual([]);
  });
});
