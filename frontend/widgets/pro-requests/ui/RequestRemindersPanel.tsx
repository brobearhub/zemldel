"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { ruRU } from "@mui/x-date-pickers/locales";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { RequestReminderDto } from "@/entities/request";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/ru";

type Props = { requestId: string };

function formatRemindAt(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function RequestRemindersPanel({ requestId }: Props) {
  const [reminders, setReminders] = useState<RequestReminderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [remindAt, setRemindAt] = useState<Dayjs | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/pro/requests/${requestId}/reminders`, { cache: "no-store" });
        if (res.ok && !cancelled) {
          const data = (await res.json()) as RequestReminderDto[];
          setReminders(data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [requestId]);

  async function handleAdd() {
    if (!text.trim() || !remindAt || !remindAt.isValid()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/pro/requests/${requestId}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), remindAt: remindAt.toDate().toISOString() }),
      });
      if (res.ok) {
        const created = (await res.json()) as RequestReminderDto;
        setReminders((prev) => [...prev, created].sort((a, b) => a.remindAt.localeCompare(b.remindAt)));
        setText("");
        setRemindAt(null);
      }
    } finally {
      setAdding(false);
    }
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

  async function handleDelete(id: string) {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    const res = await fetch(`/api/pro/reminders/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const res2 = await fetch(`/api/pro/requests/${requestId}/reminders`, { cache: "no-store" });
      if (res2.ok) setReminders((await res2.json()) as RequestReminderDto[]);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" fontWeight={800}>
          Напоминания
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" py={1}>
            <CircularProgress size={20} />
          </Box>
        ) : reminders.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Нет напоминаний по этой заявке.
          </Typography>
        ) : (
          <Stack spacing={0.5}>
            {reminders.map((r) => (
              <Stack key={r.id} direction="row" alignItems="center" spacing={0.5}>
                <Checkbox
                  size="small"
                  checked={r.isDone}
                  onChange={() => void handleToggle(r)}
                  sx={{ p: 0.5 }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    textDecoration: r.isDone ? "line-through" : "none",
                    color: r.isDone ? "text.secondary" : "text.primary",
                  }}
                >
                  {r.text}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                  {formatRemindAt(r.remindAt)}
                </Typography>
                <IconButton size="small" onClick={() => void handleDelete(r.id)} sx={{ color: "text.secondary" }}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        )}

        <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            placeholder="Текст напоминания"
            value={text}
            onChange={(e) => setText(e.target.value)}
            sx={{ flex: 1, minWidth: 160 }}
          />
          <LocalizationProvider
            dateAdapter={AdapterDayjs}
            adapterLocale="ru"
            localeText={ruRU.components.MuiLocalizationProvider.defaultProps.localeText}
          >
            <DateTimePicker
            views={["hours", "minutes"]}
            openTo="hours"
              value={remindAt}
              onChange={(v) => setRemindAt(v)}
              format="DD.MM.YYYY HH:mm"
              // viewRenderers={{
              //   hours: renderTimeViewClock,
              //   minutes: renderTimeViewClock,
              //   seconds: renderTimeViewClock,
              // }}
              thresholdToRenderTimeInASingleColumn={999} // форсим single-column
              timeSteps={{ minutes: 30 }} // чтобы список был адекватным
              referenceDate={dayjs().hour(8).minute(0).second(0).millisecond(0)}
              slotProps={{
                textField: {
                  size: "small",
                  sx: {
                    minWidth: 220,
                    "& .MuiOutlinedInput-root": {
                      height: 40,
                      color: "error.main",
                      "& fieldset": { borderColor: "rgba(224, 21, 21, 0.23)" },
                      "&:hover fieldset": { borderColor: "rgba(224, 21, 21, 0.4)" },
                      "&.Mui-focused fieldset": { borderColor: "error.main" },
                    },
                  },
                },
              }}
            />
          </LocalizationProvider>
          <Button
            variant="outlined"
            size="small"
            disabled={!text.trim() || !remindAt || !remindAt.isValid() || adding}
            onClick={() => void handleAdd()}
            sx={{ height: 40 }}
          >
            Добавить
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
