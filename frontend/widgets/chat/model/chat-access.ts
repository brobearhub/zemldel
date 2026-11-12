import type { ChatConversationAccessDto } from "@/entities/chat/dto/chat.dto";

export const CHAT_ARCHIVED_REASON_CODE =
  "CHAT_ARCHIVED_AFTER_PROVIDER_SELECTION";

export type ChatAccessState = {
  readonly status: "loading" | "ready" | "error";
  readonly canWrite: boolean;
  readonly reasonCode?: string;
  readonly message?: string;
  readonly retryable: boolean;
};

const ARCHIVED_MESSAGE =
  "Этот диалог сохранён в архиве: заказчик выбрал другого исполнителя.";

export function createClosedChatAccess(): ChatAccessState {
  return {
    status: "loading",
    canWrite: false,
    retryable: false,
  };
}

export function resolveChatAccess(
  access: ChatConversationAccessDto | null,
): ChatAccessState {
  if (!access) {
    return {
      status: "error",
      canWrite: false,
      message:
        "Не удалось проверить право отправки. Диалог доступен только для чтения.",
      retryable: true,
    };
  }

  if (access.canWrite) {
    return {
      status: "ready",
      canWrite: true,
      retryable: true,
    };
  }

  const reasonCode = access.reasonCode;
  return {
    status: "ready",
    canWrite: false,
    reasonCode,
    message:
      reasonCode === CHAT_ARCHIVED_REASON_CODE
        ? ARCHIVED_MESSAGE
        : reasonCode === "DIRECT_WAITING" ? "Ожидаем ответ клиента. До ответа можно отправить только одно сообщение."
        : reasonCode === "DIRECT_BLOCKED" ? "Клиент заблокировал прямые обращения."
        : reasonCode === "DIRECT_DECLINED" ? "Клиент отклонил обращение."
        : "Этот диалог доступен только для просмотра.",
    retryable: reasonCode !== CHAT_ARCHIVED_REASON_CODE,
  };
}

export function resolveChatError(payload: unknown): {
  readonly message: string;
  readonly retryable: boolean;
  readonly reasonCode?: string;
} {
  if (!payload || typeof payload !== "object") {
    return { message: "Ошибка отправки", retryable: true };
  }

  const record = payload as { code?: unknown; message?: unknown; error?: unknown };
  if (record.code === CHAT_ARCHIVED_REASON_CODE) {
    return { message: ARCHIVED_MESSAGE, retryable: false };
  }
  if (typeof record.code === "string" && ["DIRECT_WAITING", "DIRECT_BLOCKED", "DIRECT_DECLINED"].includes(record.code)) {
    return {
      message: resolveChatAccess({ canRead: true, canWrite: false, reasonCode: record.code }).message!,
      retryable: false,
      reasonCode: record.code,
    };
  }

  const message =
    typeof record.message === "string"
      ? record.message
      : typeof record.error === "string"
        ? record.error
        : "Ошибка отправки";
  return { message, retryable: true };
}

export function resolveChatPostFailure(error: {
  readonly message: string;
  readonly retryable: boolean;
  readonly reasonCode?: string;
}): {
  readonly message: string;
  readonly retryable: boolean;
  readonly access: ChatAccessState | null;
} {
  return {
    message: error.message,
    retryable: error.retryable,
    access: error.retryable
      ? null
      : resolveChatAccess({
          canRead: true,
          canWrite: false,
          reasonCode: error.reasonCode ?? CHAT_ARCHIVED_REASON_CODE,
        }),
  };
}
