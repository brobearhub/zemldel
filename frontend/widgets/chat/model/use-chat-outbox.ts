"use client";
import { useCallback, useRef, useState, type SetStateAction } from "react";

export type OutboundRow = {
  clientMessageId: string;
  body: string;
  replyToMessageId?: string;
  replyToPreview?: { senderLabel: string; snippet: string };
} & (
  | { type: "pending" }
  | { type: "failed"; error?: string; retryable: boolean }
);
function restore(key: string): OutboundRow[] {
  try {
    const value: unknown = key
      ? JSON.parse(sessionStorage.getItem(key) ?? "[]")
      : [];
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (r): r is OutboundRow =>
          !!r &&
          typeof r === "object" &&
          typeof r.clientMessageId === "string" &&
          typeof r.body === "string" &&
          ["pending", "failed"].includes(r.type),
      )
      .map((r) =>
        r.type === "pending"
          ? {
              ...r,
              type: "failed" as const,
              retryable: true,
              error:
                "Ответ сервера не получен. Проверьте доставку или повторите отправку.",
            }
          : r,
      );
  } catch {
    return [];
  }
}
/** Keep the original clientMessageId even if the response is lost before reauthentication. */
export function useChatOutbox(
  userId: string,
  requestId: string,
  conversationId: string,
) {
  const key = userId
    ? `chat-outbox:${userId}:${requestId}:${conversationId}`
    : "";
  const [state, setState] = useState(() => ({ key, rows: restore(key) }));
  const latest = useRef(state);
  const rows = state.key === key ? state.rows : restore(key);
  const setRows = useCallback(
    (action: SetStateAction<OutboundRow[]>) => {
      const previous =
        latest.current.key === key ? latest.current.rows : restore(key);
      const next = typeof action === "function" ? action(previous) : action;
      // Persist before starting the HTTP request, not in a later React effect.
      try {
        if (key && next.length)
          sessionStorage.setItem(key, JSON.stringify(next));
        else if (key) sessionStorage.removeItem(key);
      } catch {
        /* An in-memory retry remains usable. */
      }
      latest.current = { key, rows: next };
      setState(latest.current);
    },
    [key],
  );
  return [rows, setRows] as const;
}
