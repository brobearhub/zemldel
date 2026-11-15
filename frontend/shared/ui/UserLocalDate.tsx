"use client";

import { useEffect, useState } from "react";

type Props = {
  iso: string;
  withSeconds?: boolean;
};

function formatInBrowser(iso: string, withSeconds: boolean) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" as const } : {}),
  }).format(date);
}

/** Дата и время в часовом поясе браузера. Серверный пояс не оставляем в разметке. */
export function UserLocalDate({ iso, withSeconds = false }: Props) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(formatInBrowser(iso, withSeconds));
  }, [iso, withSeconds]);

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {label ?? "\u00a0"}
    </time>
  );
}
