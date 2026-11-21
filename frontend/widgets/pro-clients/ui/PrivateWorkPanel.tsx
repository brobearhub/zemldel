"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { getActiveMembership } from "@/core/auth/authorization";
import { useAppSelector } from "@/core/store/hooks";
import {
  formatRequestDate,
  PROVIDER_WORK_LABELS,
  type RequestProDto,
  type RequestProviderWorkStatus,
} from "@/entities/request";
import { writeClientData } from "@/entities/provider-client/api";
import { useVisibleRefresh } from "@/shared/lib/use-visible-refresh";

type Entry = { id: string; authorName: string | null; createdAt: string };
type Note = Entry & { text: string };
type WorkEvent = Entry & { status: RequestProviderWorkStatus };

export function PrivateWorkPanel({
  request,
  status,
  onChange,
}: {
  request: RequestProDto;
  status: RequestProviderWorkStatus;
  onChange: (status: RequestProviderWorkStatus) => void;
}) {
  const membership = useAppSelector((state) =>
    getActiveMembership(state.auth.user),
  );
  const [notes, setNotes] = useState<Note[]>([]);
  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [readError, setReadError] = useState("");
  const [writeError, setWriteError] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const base = `/api/pro/requests/${request.id}`;
  const canManage =
    membership?.status === "ACTIVE" &&
    membership.providerId === request.providerId &&
    membership.role !== "EMPLOYEE";
  const terminal = ["ACCEPTED", "COMPLETED", "CANCELLED", "CLOSED"].includes(
    request.status,
  );
  const refresh = useVisibleRefresh({
    requestId: request.id,
    scope: `${base}:${status}`,
    paused: !canManage || busy,
    async onRefresh(signal) {
      try {
        const [history, entries] = await Promise.all(
          ["provider-work", "provider-notes"].map(async (resource) => {
            const response = await fetch(`${base}/${resource}`, {
              cache: "no-store",
              signal,
            });
            if (!response.ok)
              throw new Error("Не удалось загрузить историю работ");
            return response.json();
          }),
        );
        if (signal.aborted) return;
        setEvents(history.events);
        setNotes(entries);
        setReadError("");
      } catch {
        if (!signal.aborted) setReadError("Не удалось загрузить историю работ");
      }
    },
  });

  async function update(status: RequestProviderWorkStatus) {
    if (busy) return;
    setBusy(true);
    setWriteError("");
    try {
      const result = await writeClientData<{
        status: RequestProviderWorkStatus;
      }>(`${base}/provider-work`, "PATCH", { status });
      onChange(result.status);
    } catch (cause) {
      setWriteError(
        cause instanceof Error ? cause.message : "Не удалось изменить статус",
      );
    } finally {
      setBusy(false);
    }
  }
  async function addNote(event: FormEvent) {
    event.preventDefault();
    if (busy || !text.trim()) return;
    setBusy(true);
    setWriteError("");
    try {
      const note = await writeClientData<Note>(
        `${base}/provider-notes`,
        "POST",
        { text: text.trim() },
        true,
      );
      setNotes((list) => [note, ...list.filter((item) => item.id !== note.id)]);
      setText("");
    } catch (cause) {
      setWriteError(
        cause instanceof Error ? cause.message : "Не удалось сохранить заметку",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!canManage) return null;
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack spacing={2}>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: "wrap", alignItems: "center" }}
        >
          <Typography component="h2" variant="h6">
            Работа по заявке клиента
          </Typography>
          <Chip size="small" label={PROVIDER_WORK_LABELS[status]} />
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: "wrap", alignItems: "center" }}
        >
          <Typography variant="body2" color="text.secondary">
            {request.customerUserId
              ? "Клиент подключён"
              : "Клиент пока не подключён"}
            {status === "DONE" &&
              !request.acceptedAt &&
              " · Клиент ещё не принял результат"}
          </Typography>
          {request.providerClientId && (
            <Button
              size="small"
              component={Link}
              href={`/pro/clients/${request.providerClientId}`}
            >
              Карточка клиента
            </Button>
          )}
        </Stack>
        {!terminal && (
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            {status !== "IN_PROGRESS" && (
              <Button
                size="small"
                variant="outlined"
                disabled={busy}
                onClick={() => void update("IN_PROGRESS")}
              >
                {status === "DONE" ? "Вернуть в работу" : "Начать работу"}
              </Button>
            )}
            {status !== "DONE" && (
              <Button
                size="small"
                variant="outlined"
                disabled={busy}
                onClick={() => void update("DONE")}
              >
                Отметить работу выполненной
              </Button>
            )}
          </Stack>
        )}
        {events.length > 0 && (
          <Stack spacing={0.5}>
            {events.map((entry) => (
              <Typography
                key={entry.id}
                variant="body2"
                color="text.secondary"
                sx={{ overflowWrap: "anywhere" }}
              >
                {formatRequestDate(entry.createdAt)} ·{" "}
                {PROVIDER_WORK_LABELS[entry.status]} ·{" "}
                {entry.authorName || "Участник команды"}
              </Typography>
            ))}
          </Stack>
        )}
        <Divider />
        <Typography variant="subtitle1" component="h3">
          Внутренние заметки команды
        </Typography>
        {!terminal && (
          <Stack
            component="form"
            onSubmit={addNote}
            spacing={1}
            sx={{ alignItems: "flex-start" }}
          >
            <TextField
              label="Заметка"
              size="small"
              fullWidth
              multiline
              maxRows={6}
              value={text}
              disabled={busy}
              onChange={(event) => setText(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 5000 } }}
              helperText="Видна только вашей команде"
            />
            <Button size="small" type="submit" disabled={busy || !text.trim()}>
              Добавить заметку
            </Button>
          </Stack>
        )}
        {notes.map((entry) => (
          <Stack key={entry.id} spacing={0.25}>
            <Typography
              variant="body2"
              sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              {entry.text}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {entry.authorName || "Участник команды"} ·{" "}
              {formatRequestDate(entry.createdAt)}
            </Typography>
          </Stack>
        ))}
        {readError && (
          <Alert
            severity="warning"
            action={<Button onClick={refresh}>Повторить</Button>}
          >
            {readError}
          </Alert>
        )}
        {writeError && <Alert severity="error">{writeError}</Alert>}
      </Stack>
    </Paper>
  );
}
