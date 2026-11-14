"use client";
import { useState } from "react";
import { Alert, Button, Stack } from "@mui/material";
import { favoritesJson } from "@/features/favorites/api";
export function DirectChatActions({
  conversationId,
  state,
  onChange,
}: {
  conversationId: string;
  state?: string | null;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [acceptedConversationId, setAcceptedConversationId] = useState<
    string | null
  >(null);
  const isWaiting =
    state === "WAITING" && acceptedConversationId !== conversationId;
  async function act(action: "accept" | "decline" | "block" | "resume") {
    setBusy(true);
    setError("");
    try {
      await favoritesJson(`/api/chat/conversations/${conversationId}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setAcceptedConversationId(action === "accept" ? conversationId : null);
      onChange();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Не удалось изменить диалог",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Stack
      spacing={1}
      sx={{
        p: 1.5,
        flexShrink: 0,
      }}
    >
      {isWaiting ? (
        <Alert severity="warning">
          Исполнитель написал, потому что вы сохранили его профиль или услугу.{" "}
          Ответьте или нажмите «Вступить в переписку», чтобы начать диалог.
        </Alert>
      ) : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ flexWrap: "wrap" }}
      >
        {isWaiting ? (
          <>
            <Button
              size="small"
              disabled={busy}
              onClick={() => void act("accept")}
              sx={{ color: "text.secondary" }}
            >
              Вступить в переписку
            </Button>
            <Button
              size="small"
              disabled={busy}
              onClick={() => void act("decline")}
              sx={{ color: "text.secondary" }}
            >
              Отклонить обращение
            </Button>
          </>
        ) : null}
        {state !== "BLOCKED" ? (
          <Button
            size="small"
            color="error"
            disabled={busy}
            onClick={() => void act("block")}
          >
            Заблокировать
          </Button>
        ) : null}
        {state === "BLOCKED" || state === "DECLINED" ? (
          <Button
            size="small"
            disabled={busy}
            onClick={() => void act("resume")}
          >
            Возобновить переписку
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}
