import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useRequestFormDraft } from "./use-request-form-draft";

beforeEach(() => sessionStorage.clear());
describe("request form drafts", () => {
  it("restores partial fields and city after closing and shares edits between mobile and desktop", () => {
    const first = renderHook(() =>
      useRequestFormDraft("guest", "FREEFORM", null),
    );
    const second = renderHook(() =>
      useRequestFormDraft("guest", "FREEFORM", null),
    );
    act(() => {
      first.result.current.setForm((form) => ({
        ...form,
        message: "Нужно межевание",
        cadastralNumbers: [["66", "", "", ""]],
      }));
      first.result.current.setCityOverride({
        id: "city",
        name: "Город",
        displayName: "Город",
        regionName: "Регион",
        regionCode: "66",
      });
    });
    expect(second.result.current.form.message).toBe("Нужно межевание");
    first.unmount();
    second.unmount();
    const restored = renderHook(() =>
      useRequestFormDraft("guest", "FREEFORM", null),
    );
    expect(restored.result.current.cityOverride?.id).toBe("city");
    expect(restored.result.current.form.cadastralNumbers[0][0]).toBe("66");
    act(() => restored.result.current.clearDraft());
    restored.unmount();
    const cleared = renderHook(() =>
      useRequestFormDraft("guest", "FREEFORM", null),
    );
    expect(cleared.result.current.form.message).toBe("");
    expect(cleared.result.current.cityOverride).toBeUndefined();
  });
  it("isolates actors and categories, including an actor change without unmounting", () => {
    const hook = renderHook(
      ({ actor, scope }) => useRequestFormDraft(actor, scope, null),
      { initialProps: { actor: "one", scope: "FREEFORM" } },
    );
    act(() =>
      hook.result.current.setForm((form) => ({
        ...form,
        message: "Личный черновик",
      })),
    );
    hook.rerender({ actor: "two", scope: "FREEFORM" });
    expect(hook.result.current.form.message).toBe("");
    hook.rerender({ actor: "one", scope: "category" });
    expect(hook.result.current.form.message).toBe("");
    hook.rerender({ actor: "one", scope: "FREEFORM" });
    expect(hook.result.current.form.message).toBe("Личный черновик");
  });
  it("ignores expired and malformed drafts", () => {
    sessionStorage.setItem(
      "request-form:v1:guest:FREEFORM",
      JSON.stringify({
        savedAt: Date.now() - 86400001,
        form: { message: "Expired", cadastralNumbers: [] },
      }),
    );
    const expired = renderHook(() =>
      useRequestFormDraft("guest", "FREEFORM", null),
    );
    expect(expired.result.current.form.message).toBe("");
    expired.unmount();
    sessionStorage.setItem("request-form:v1:guest:FREEFORM", "broken json");
    expect(
      renderHook(() => useRequestFormDraft("guest", "FREEFORM", null)).result
        .current.form.message,
    ).toBe("");
  });
});
