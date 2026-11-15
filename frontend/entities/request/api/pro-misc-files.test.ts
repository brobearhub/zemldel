import { afterEach, describe, expect, it, vi } from "vitest";
import {
  uploadProRequestMiscFiles,
  setProRequestMiscFileVisibility,
} from "./pro-contract-bundles";

afterEach(() => vi.unstubAllGlobals());

describe("provider document upload", () => {
  it.each([true, false])(
    "saves existing file visibility %s",
    async (visibleToCustomer) => {
      const updated = { id: "file", visibleToCustomer };
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify(updated)));
      vi.stubGlobal("fetch", fetchMock);
      expect(
        await setProRequestMiscFileVisibility(
          "request",
          "file",
          visibleToCustomer,
        ),
      ).toEqual(updated);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/pro/requests/request/provider-misc/file",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visibleToCustomer }),
        },
      );
    },
  );

  it("reports a rejected visibility update", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: "Нет доступа" }), {
            status: 403,
          }),
        ),
    );
    await expect(
      setProRequestMiscFileVisibility("request", "file", false),
    ).rejects.toThrow("Нет доступа");
  });
  it.each([true, false])(
    "sends explicit visibility %s with the files",
    async (visible) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ created: [{ id: "file" }] })),
        );
      vi.stubGlobal("fetch", fetchMock);
      const file = new File(["test"], "plan.pdf", { type: "application/pdf" });
      await uploadProRequestMiscFiles("request", [file], visible);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/pro/requests/request/provider-misc");
      expect(options.method).toBe("POST");
      expect(options.body.get("visibleToCustomer")).toBe(String(visible));
      expect(options.body.getAll("files")).toEqual([file]);
    },
  );
});
