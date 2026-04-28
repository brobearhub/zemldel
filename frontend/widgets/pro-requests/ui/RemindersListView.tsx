"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Box,
  Checkbox,
  Chip,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import type { RequestReminderDto } from "@/entities/request";

type View = "byDate" | "byRequest";

const STORAGE_KEY = "pro_reminders_view";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getReminderLabel(reminder: RequestReminderDto) {
  return reminder.request.service?.title ?? reminder.request.category?.name ?? "Заявка";
}

function getDateBucket(remindAt: string): string {
  const d = new Date(remindAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);
  const weekEnd = new Date(today.getTime() + 7 * 86400000);
  const rd = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (rd < today) return "overdue";
  if (rd.getTime() === today.getTime()) return "today";
  if (rd.getTime() === tomorrow.getTime()) return "tomorrow";
  if (rd < weekEnd) return "week";
  return "later";
}

const BUCKET_ORDER = ["overdue", "today", "tomorrow", "week", "later"] as const;
const BUCKET_LABELS: Record<string, string> = {
  overdue: "Просрочено",
  today: "Сегодня",
  tomorrow: "Завтра",
  week: "На этой неделе",
  later: "Позже",
};

type Props = { initialReminders: RequestReminderDto[] };

export function RemindersListView({ initialReminders }: Props) {
  const [view, setView] = useState<View>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "byDate" || saved === "byRequest") return saved;
    }
    return "byDate";
  });
  const [reminders, setReminders] = useState(initialReminders);

  function handleViewChange(_: React.MouseEvent, val: View | null) {
    if (!val) return;
    setView(val);
    localStorage.setItem(STORAGE_KEY, val);
  }

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

  function ReminderRow({ r }: { r: RequestReminderDto }) {
    return (
      <Stack direction="row" alignItems="flex-start" spacing={0.5} py={0.5}>
        <Checkbox
          size="small"
          checked={r.isDone}
          onChange={() => void handleToggle(r)}
          sx={{ p: 0.5, flexShrink: 0, mt: 0.25 }}
        />
        <Box flex={1} minWidth={0}>
          <Typography
            variant="body2"
            sx={{
              textDecoration: r.isDone ? "line-through" : "none",
              color: r.isDone ? "text.secondary" : "text.primary",
            }}
          >
            {r.text}
          </Typography>
          {(r.request.message || r.request.location) && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={0.25}>
              {r.request.message && (
                <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 320 }}>
                  {r.request.message}
                </Typography>
              )}
              {r.request.location && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  📍 {r.request.location}
                </Typography>
              )}
            </Stack>
          )}
        </Box>
        <Stack alignItems="flex-end" spacing={0.25} flexShrink={0}>
          <Typography
            component={Link}
            href={`/pro/requests/${r.requestId}`}
            variant="caption"
            sx={{
              color: "primary.main",
              textDecoration: "none",
              whiteSpace: "nowrap",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {getReminderLabel(r)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
            {formatDateTime(r.remindAt)}
          </Typography>
        </Stack>
      </Stack>
    );
  }

  const byDateView = () => {
    const buckets = BUCKET_ORDER.map((key) => ({
      key,
      label: BUCKET_LABELS[key],
      items: reminders.filter((r) => getDateBucket(r.remindAt) === key),
    })).filter((b) => b.items.length > 0);

    if (buckets.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          Напоминаний пока нет.
        </Typography>
      );
    }

    return (
      <Stack spacing={2}>
        {buckets.map(({ key, label, items }) => (
          <Box key={key}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: "0.08em",
                  color: key === "overdue" ? "error.main" : "text.secondary",
                }}
              >
                {label}
              </Typography>
              <Chip
                size="small"
                label={items.length}
                color={key === "overdue" ? "error" : "default"}
                variant="outlined"
                sx={{ height: 18, fontSize: 11 }}
              />
            </Stack>
            <Paper variant="outlined" sx={{ px: 1.5, py: 0.5 }}>
              <Stack divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
                {items.map((r) => (
                  <ReminderRow key={r.id} r={r} />
                ))}
              </Stack>
            </Paper>
          </Box>
        ))}
      </Stack>
    );
  };

  const byRequestView = () => {
    const groups = new Map<string, { label: string; items: RequestReminderDto[] }>();
    for (const r of reminders) {
      const key = r.requestId;
      if (!groups.has(key)) {
        groups.set(key, { label: getReminderLabel(r), items: [] });
      }
      groups.get(key)!.items.push(r);
    }

    if (groups.size === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          Напоминаний пока нет.
        </Typography>
      );
    }

    return (
      <Stack spacing={2}>
        {[...groups.entries()].map(([requestId, { label, items }]) => (
          <Paper key={requestId} variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography
                  component={Link}
                  href={`/pro/requests/${requestId}`}
                  variant="subtitle2"
                  fontWeight={700}
                  sx={{ color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                >
                  {label}
                </Typography>
                <Chip size="small" label={items.length} variant="outlined" sx={{ height: 18, fontSize: 11 }} />
              </Stack>
              <Stack divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
                {items
                  .slice()
                  .sort((a, b) => a.remindAt.localeCompare(b.remindAt))
                  .map((r) => (
                    <Stack key={r.id} direction="row" alignItems="flex-start" spacing={0.5} py={0.5}>
                      <Checkbox
                        size="small"
                        checked={r.isDone}
                        onChange={() => void handleToggle(r)}
                        sx={{ p: 0.5, flexShrink: 0, mt: 0.25 }}
                      />
                      <Box flex={1} minWidth={0}>
                        <Typography
                          variant="body2"
                          sx={{
                            textDecoration: r.isDone ? "line-through" : "none",
                            color: r.isDone ? "text.secondary" : "text.primary",
                          }}
                        >
                          {r.text}
                        </Typography>
                        {(r.request.message || r.request.location) && (
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={0.25}>
                            {r.request.message && (
                              <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 320 }}>
                                {r.request.message}
                              </Typography>
                            )}
                            {r.request.location && (
                              <Typography variant="caption" color="text.secondary" noWrap>
                                📍 {r.request.location}
                              </Typography>
                            )}
                          </Stack>
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                        {formatDateTime(r.remindAt)}
                      </Typography>
                    </Stack>
                  ))}
              </Stack>
            </Stack>
          </Paper>
        ))}
      </Stack>
    );
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
        <Typography variant="h4" fontWeight={800}>
          Напоминания
        </Typography>
        <ToggleButtonGroup value={view} exclusive onChange={handleViewChange} size="small">
          <ToggleButton value="byDate">
            <CalendarTodayOutlinedIcon fontSize="small" sx={{ mr: 0.75 }} />
            По дате
          </ToggleButton>
          <ToggleButton value="byRequest">
            <FolderOpenOutlinedIcon fontSize="small" sx={{ mr: 0.75 }} />
            По заявкам
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {view === "byDate" ? byDateView() : byRequestView()}
    </Stack>
  );
}
