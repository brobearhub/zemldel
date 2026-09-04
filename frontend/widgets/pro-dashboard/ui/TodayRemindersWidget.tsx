"use client";

import Link from "next/link";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import type { RequestReminderDto } from "@/entities/request";

type Props = { reminders: RequestReminderDto[] };

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getReminderLabel(reminder: RequestReminderDto) {
  return reminder.request.service?.title ?? reminder.request.category?.name ?? "Заявка";
}

export function TodayRemindersWidget({ reminders }: Props) {
  const visible = reminders.slice(0, 5);

  return (
    <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
      <Stack spacing={1.5} sx={{
        height: "100%"
      }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            justifyContent: "space-between"
          }}>
          <Stack direction="row" spacing={1} sx={{
            alignItems: "center"
          }}>
            <NotificationsNoneOutlinedIcon color="primary" fontSize="small" />
            <Typography variant="h6" sx={{
              fontWeight: 800
            }}>
              Напоминания на сегодня
            </Typography>
          </Stack>
          {reminders.length > 0 && (
            <Chip size="small" label={reminders.length} color="primary" />
          )}
        </Stack>

        {visible.length === 0 ? (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Нет напоминаний на сегодня.
          </Typography>
        ) : (
          <Stack spacing={1} sx={{
            flex: 1
          }}>
            {visible.map((r) => (
              <Box
                key={r.id}
                component={Link}
                href={`/pro/requests/${r.requestId}`}
                sx={{
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
                  "&:hover": { opacity: 0.75 },
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    justifyContent: "space-between",
                    alignItems: "flex-start"
                  }}>
                  <Box sx={{
                    minWidth: 0
                  }}>
                    <Typography variant="body2" noWrap sx={{
                      fontWeight: 500
                    }}>
                      {r.text}
                    </Typography>
                    <Typography variant="caption" noWrap sx={{
                      color: "text.secondary"
                    }}>
                      {getReminderLabel(r)}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      whiteSpace: "nowrap",
                      flexShrink: 0
                    }}>
                    {formatTime(r.remindAt)}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}

        <Box>
          <Typography
            component={Link}
            href="/pro/reminders"
            variant="body2"
            sx={{ color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
          >
            Все напоминания →
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
