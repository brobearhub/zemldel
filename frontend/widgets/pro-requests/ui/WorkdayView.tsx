"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Box,
  Checkbox,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import type { RequestReminderDto } from "@/entities/request";

type Props = { initialReminders: RequestReminderDto[] };

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getReminderLabel(r: RequestReminderDto) {
  return r.request.service?.title ?? r.request.category?.name ?? "Заявка";
}

type Urgency = "overdue" | "soon" | "near" | "ok" | "done";

function getUrgency(remindAt: string, isDone: boolean): Urgency {
  if (isDone) return "done";
  const diff = new Date(remindAt).getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 30 * 60 * 1000) return "soon";
  if (diff < 2 * 60 * 60 * 1000) return "near";
  return "ok";
}

function formatCountdown(remindAt: string, isDone: boolean): string {
  if (isDone) return "выполнено";
  const diff = new Date(remindAt).getTime() - Date.now();
  const abs = Math.abs(diff);
  const totalMin = Math.floor(abs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  if (diff < 0) {
    if (h > 0) return `${h} ч ${m} мин назад`;
    if (m > 0) return `${m} мин назад`;
    return "только что";
  }
  if (h > 0) return `через ${h} ч ${m} мин`;
  if (m > 0) return `через ${m} мин`;
  return "менее минуты";
}

const URGENCY_COLOR: Record<Urgency, "error" | "warning" | "info" | "success" | "default"> = {
  overdue: "error",
  soon: "warning",
  near: "info",
  ok: "success",
  done: "default",
};

export function WorkdayView({ initialReminders }: Props) {
  const [reminders, setReminders] = useState(initialReminders);
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setTick((t) => t + 1), 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function handleToggle(reminder: RequestReminderDto) {
    const next = !reminder.isDone;
    setReminders((prev) => prev.map((r) => (r.id === reminder.id ? { ...r, isDone: next } : r)));
    const res = await fetch(`/api/pro/reminders/${reminder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: next }),
    });
    if (!res.ok) {
      setReminders((prev) => prev.map((r) => (r.id === reminder.id ? { ...r, isDone: reminder.isDone } : r)));
    }
  }

  const pending = reminders.filter((r) => !r.isDone);
  const done = reminders.filter((r) => r.isDone);

  if (reminders.length === 0) {
    return (
      <Stack spacing={3}>
        <Typography variant="h4" sx={{
          fontWeight: 800
        }}>
          Рабочий день
        </Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Напоминаний на сегодня нет.
        </Typography>
      </Stack>
    );
  }

  function ReminderCard({ r }: { r: RequestReminderDto }) {
    const urgency = getUrgency(r.remindAt, r.isDone);
    const countdown = formatCountdown(r.remindAt, r.isDone);
    const color = URGENCY_COLOR[urgency];

    return (
      <Paper
        variant="outlined"
        sx={(theme) => ({
          p: 2,
          borderLeft: "4px solid",
          borderLeftColor:
            urgency === "overdue"
              ? theme.palette.error.main
              : urgency === "soon"
                ? theme.palette.warning.main
                : urgency === "near"
                  ? theme.palette.info.main
                  : urgency === "done"
                    ? theme.palette.divider
                    : theme.palette.success.main,
          opacity: r.isDone ? 0.6 : 1,
        })}
      >
        <Stack direction="row" spacing={1.5} sx={{
          alignItems: "flex-start"
        }}>
          <Checkbox
            size="small"
            checked={r.isDone}
            onChange={() => void handleToggle(r)}
            sx={{ p: 0, mt: 0.25, flexShrink: 0 }}
          />

          <Box
            sx={{
              flex: 1,
              minWidth: 0
            }}>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{
                alignItems: "center",
                flexWrap: "wrap",
                mb: 0.5
              }}>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 600,
                  textDecoration: r.isDone ? "line-through" : "none",
                  color: r.isDone ? "text.secondary" : "text.primary"
                }}>
                {r.text}
              </Typography>
              <Chip size="small" label={countdown} color={color} variant="outlined" />
            </Stack>

            {(r.request.message || r.request.location) && (
              <Stack
                direction="row"
                spacing={1.5}
                useFlexGap
                sx={{
                  flexWrap: "wrap",
                  mb: 0.5
                }}>
                {r.request.message && (
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{
                      color: "text.secondary",
                      maxWidth: 400
                    }}>
                    {r.request.message}
                  </Typography>
                )}
                {r.request.location && (
                  <Typography variant="body2" noWrap sx={{
                    color: "text.secondary"
                  }}>
                    📍 {r.request.location}
                  </Typography>
                )}
              </Stack>
            )}

            <Typography
              component={Link}
              href={`/pro/requests/${r.requestId}`}
              variant="caption"
              sx={{
                color: "primary.main",
                textDecoration: "none",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              {getReminderLabel(r)}
            </Typography>
          </Box>

          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: "text.secondary",
              flexShrink: 0
            }}>
            {formatTime(r.remindAt)}
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap"
        }}>
        <Typography variant="h4" sx={{
          fontWeight: 800
        }}>
          Рабочий день
        </Typography>
        <Stack direction="row" spacing={1}>
          {pending.length > 0 && <Chip label={`Осталось: ${pending.length}`} color="primary" size="small" />}
          {done.length > 0 && <Chip label={`Выполнено: ${done.length}`} color="success" size="small" variant="outlined" />}
        </Stack>
      </Stack>

      {pending.length > 0 && (
        <Stack spacing={1.5}>
          {pending.map((r) => (
            <ReminderCard key={r.id} r={r} />
          ))}
        </Stack>
      )}

      {done.length > 0 && (
        <Stack spacing={1}>
          <Typography
            variant="overline"
            sx={{
              color: "text.secondary",
              letterSpacing: "0.08em"
            }}>
            Выполнено
          </Typography>
          <Stack spacing={1}>
            {done.map((r) => (
              <ReminderCard key={r.id} r={r} />
            ))}
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}
