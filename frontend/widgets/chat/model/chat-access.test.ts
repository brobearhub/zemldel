import { describe, expect, it } from "vitest";
import {
  createClosedChatAccess,
  resolveChatAccess,
  resolveChatError,
} from "./chat-access";

describe("chat access model", () => {
  it("до успешной загрузки и при ошибке access запрещает запись", () => {
    expect(createClosedChatAccess()).toMatchObject({
      status: "loading",
      canWrite: false,
    });

    expect(resolveChatAccess(null)).toMatchObject({
      status: "error",
      canWrite: false,
    });
  });

  it("локализует архивный lock и помечает его non-retryable", () => {
    const access = resolveChatAccess({
      canRead: true,
      canWrite: false,
      reasonCode: "CHAT_ARCHIVED_AFTER_PROVIDER_SELECTION",
    });

    expect(access).toEqual({
      status: "ready",
      canWrite: false,
      reasonCode: "CHAT_ARCHIVED_AFTER_PROVIDER_SELECTION",
      message:
        "Этот диалог сохранён в архиве: заказчик выбрал другого исполнителя.",
      retryable: false,
    });
  });

  it("stable lock ошибки отправки не показывают retry", () => {
    expect(
      resolveChatError({
        code: "CHAT_ARCHIVED_AFTER_PROVIDER_SELECTION",
        message: "Request is locked",
      }),
    ).toEqual({
      message:
        "Этот диалог сохранён в архиве: заказчик выбрал другого исполнителя.",
      retryable: false,
    });
  });
});
