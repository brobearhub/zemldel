import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChatDraft } from "./use-chat-draft";
describe("tab-local chat drafts", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => {cleanup(); vi.restoreAllMocks();});
  it("restores a draft after remount and removes it after sending", () => {
    const first = renderHook(() => useChatDraft("user", "request", "a"));
    act(() => first.result.current[1]("Unsent text")); first.unmount();
    const next = renderHook(() => useChatDraft("user", "request", "a"));
    expect(next.result.current[0]).toBe("Unsent text");
    act(() => next.result.current[1]("")); next.unmount();
    expect(renderHook(() => useChatDraft("user", "request", "a")).result.current[0]).toBe("");
  });
  it("isolates users, requests and conversations during account and thread switches", () => {
    const {result, rerender} = renderHook(({user, request, chat}) => useChatDraft(user, request, chat), {initialProps:{user:"one", request:"r1", chat:"a"}});
    act(() => result.current[1]("Private draft"));
    for (const props of [{user:"two",request:"r1",chat:"a"},{user:"one",request:"r2",chat:"a"},{user:"one",request:"r1",chat:"b"},{user:"",request:"r1",chat:"a"}]) {
      rerender(props); expect(result.current[0]).toBe("");
    }
    rerender({user:"one",request:"r1",chat:"a"}); expect(result.current[0]).toBe("Private draft");
  });
  it("keeps editing functional when storage is blocked", () => {
    vi.spyOn(Storage.prototype,"getItem").mockImplementation(()=>{throw new Error("blocked");});
    vi.spyOn(Storage.prototype,"setItem").mockImplementation(()=>{throw new Error("blocked");});
    const {result} = renderHook(()=>useChatDraft("u","r","a"));
    act(()=>result.current[1]("Still editable")); expect(result.current[0]).toBe("Still editable");
  });
});
