"use client";

import { Box, Typography } from "@mui/material";
import { useEffect, useState, type ReactNode } from "react";

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

export function CabinetHeaderStatus({ notification }: { notification: ReactNode }) {
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
      {notification}
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
