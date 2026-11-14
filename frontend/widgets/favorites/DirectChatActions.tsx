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
  async function act(action: "accept" | "decline" | "block" | "resume") {
    setBusy(true);
    setError("");
    try {
      await favoritesJson(`/api/chat/conversations/${conversationId}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
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
      <Alert severity="info">
        Исполнитель написал, потому что вы сохранили его профиль или услугу.{" "}
        {state === "WAITING"
          ? "Ответьте или нажмите «Вступить в переписку», чтобы начать диалог."
          : state === "BLOCKED"
            ? "Вы заблокировали прямые обращения этого исполнителя."
            : state === "DECLINED"
              ? "Вы отклонили обращение."
              : "Вы можете заблокировать дальнейшие прямые обращения."}
      </Alert>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ flexWrap: "wrap" }}
      >
        {state === "WAITING" ? (
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
