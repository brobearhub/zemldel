import { afterEach, describe, expect, it, vi } from "vitest";
import { messengerApi, MessengerRequestError } from "./messengers";

afterEach(() => vi.unstubAllGlobals());

describe("messenger request errors", () => {
  it("preserves the conflict status and code for connection recovery", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      message: "Этот аккаунт мессенджера подключён к другому аккаунту сайта.",
      code: "MESSENGER_ACCOUNT_IN_USE",
    }, { status: 409 })));
    await expect(messengerApi.confirm("MAX", "token")).rejects.toMatchObject({
      status: 409,
      code: "MESSENGER_ACCOUNT_IN_USE",
    });
  });

  it("recognizes a legacy conflict without a structured error code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "Conflict" }, { status: 409 })));
    await expect(messengerApi.link("TELEGRAM")).rejects.toBeInstanceOf(MessengerRequestError);
  });

  it("does not cache status reads", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json([]));
    vi.stubGlobal("fetch", fetch);
    await messengerApi.status();
    expect(fetch).toHaveBeenCalledWith("/api/messengers", expect.objectContaining({ cache: "no-store" }));
  });
});
