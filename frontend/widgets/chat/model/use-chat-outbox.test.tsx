import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useChatOutbox } from "./use-chat-outbox";
describe("durable chat outbox", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(cleanup);
  it("restores an unknown send with its original ID for a safe retry", () => {
    const first = renderHook(() => useChatOutbox("u", "r", "a"));
    act(() =>
      first.result.current[1]([
        { type: "pending", clientMessageId: "same-id", body: "QA" },
      ]),
    );
    first.unmount();
    const next = renderHook(() => useChatOutbox("u", "r", "a"));
    expect(next.result.current[0]).toMatchObject([
      {
        type: "failed",
        clientMessageId: "same-id",
        body: "QA",
        retryable: true,
      },
    ]);
    act(() => next.result.current[1]([]));
    next.unmount();
    expect(
      renderHook(() => useChatOutbox("u", "r", "a")).result.current[0],
    ).toEqual([]);
  });
  it("isolates accounts and conversations", () => {
    const a = renderHook(() => useChatOutbox("u", "r", "a"));
    act(() =>
      a.result.current[1]([
        { type: "pending", clientMessageId: "private", body: "QA" },
      ]),
    );
    expect(
      renderHook(() => useChatOutbox("other", "r", "a")).result.current[0],
    ).toEqual([]);
    expect(
      renderHook(() => useChatOutbox("u", "r", "b")).result.current[0],
    ).toEqual([]);
  });
});
