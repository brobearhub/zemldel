"use client";

import Link from "next/link";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import { Badge, Box, IconButton, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useReminderCount } from "../model/ReminderCountProvider";

const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDate(date: Date): string {
  const parts = dateFormatter.formatToParts(date);
  return ["day", "month", "year"]
    .map((type) => parts.find((part) => part.type === type)?.value ?? "")
    .join(" ");
}

function sameMinute(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate() &&
    left.getHours() === right.getHours() &&
    left.getMinutes() === right.getMinutes()
  );
}

function useVisibleMinute(): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let timer: number | undefined;

    const clearTimer = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
    };
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      clearTimer();
      const current = new Date();
      setNow((previous) =>
        previous && sameMinute(previous, current) ? previous : current,
      );
      const untilNextMinute =
        60_000 - (current.getSeconds() * 1_000 + current.getMilliseconds()) + 20;
      timer = window.setTimeout(refresh, untilNextMinute);
    };
    const onVisibilityChange = () => {
      clearTimer();
      if (document.visibilityState === "visible") refresh();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", refresh);
    refresh();

    return () => {
      clearTimer();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return now;
}

export function ProviderHeaderStatus() {
  const now = useVisibleMinute();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: { xs: 1, lg: 2 },
        color: "text.secondary",
        whiteSpace: "nowrap",
      }}
    >
      <Typography
        component="time"
        variant="body1"
        sx={{
          minWidth: 48,
          fontVariantNumeric: "tabular-nums",
          textAlign: "right",
        }}
      >
        {now ? timeFormatter.format(now) : "··:··"}
      </Typography>
      <ProviderNotificationsButton />
      <Box
        aria-hidden
        sx={{
          width: "1px",
          height: 24,
          bgcolor: "divider",
        }}
      />
      <Typography
        component="time"
        variant="body1"
        sx={{
          display: { xs: "none", lg: "block" },
          minWidth: 126,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {now ? formatDate(now) : " "}
      </Typography>
      <Box
        aria-hidden
        sx={{
          display: { xs: "none", lg: "block" },
          width: "1px",
          height: 24,
          bgcolor: "divider",
        }}
      />
    </Box>
  );
}

export function ProviderNotificationsButton({
  onNavigate,
  label = "Открыть напоминания",
  buttonSize = 40,
}: {
  onNavigate?: () => void;
  label?: string;
  buttonSize?: number;
} = {}) {
  const count = useReminderCount();
  return (
    <IconButton
      component={Link}
      href="/pro/reminders"
      aria-label={count > 0 ? `${label}: ${count} в ближайший час` : label}
      title={count > 0 ? `В ближайший час: ${count}` : label}
      onClick={onNavigate}
      size="small"
      sx={{
        color: "inherit",
        width: buttonSize,
        height: buttonSize,
        flexShrink: 0,
      }}
    >
      <Badge
        badgeContent={count}
        max={99}
        sx={{
          "& .MuiBadge-badge": {
            bgcolor: "#ed6c02",
            color: "#1f160d",
            fontSize: "0.6875rem",
            fontWeight: 800,
            height: 18,
            minWidth: 18,
            px: 0.5,
            borderRadius: "9px",
          },
        }}
      >
        <NotificationsNoneOutlinedIcon
          sx={{
            fontSize: 23,
          }}
        />
      </Badge>
    </IconButton>
  );
}
