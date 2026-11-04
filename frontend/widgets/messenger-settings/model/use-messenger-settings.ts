"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { messengerApi } from "@/entities/messenger/api/messengers";
import type {
  MessengerLink,
  MessengerPlatform,
  MessengerStatus,
} from "@/entities/messenger/model/types";

export function useMessengerSettings() {
  const [items, setItems] = useState<MessengerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [links, setLinks] = useState<
    Partial<Record<MessengerPlatform, MessengerLink>>
  >({});
  const mounted = useRef(false);
  const fetching = useRef<Promise<void> | null>(null);

  const refresh = useCallback((): Promise<void> => {
    if (fetching.current) return fetching.current;
    if (mounted.current) setRefreshing(true);
    const pending = (async () => {
      try {
        const result = await messengerApi.status();
        if (mounted.current) {
          setItems(result);
          setError(null);
        }
      } catch (e) {
        if (mounted.current)
          setError(
            e instanceof Error ? e.message : "Не удалось загрузить подключения",
          );
      } finally {
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();
    fetching.current = pending;
    void pending.then(() => {
      fetching.current = null;
    });
    return pending;
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const focus = () => {
      void refresh();
    };
    window.addEventListener("focus", focus);
    return () => {
      mounted.current = false;
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);

  const hasPending = items.some((item) => item.pending);
  useEffect(() => {
    if (!hasPending) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [hasPending, refresh]);

  async function action(
    platform: MessengerPlatform,
    kind: "link" | "confirm" | "disconnect" | "notifications",
    value?: string | boolean,
  ) {
    if (busy) return;
    setBusy(`${platform}:${kind}`);
    setError(null);
    try {
      if (kind === "link") {
        const link = await messengerApi.link(platform);
        if (mounted.current)
          setLinks((previous) => ({ ...previous, [platform]: link }));
      } else if (kind === "confirm" && typeof value === "string") {
        await messengerApi.confirm(platform, value);
      } else if (kind === "disconnect") {
        await messengerApi.disconnect(platform);
        if (mounted.current)
          setLinks((previous) => ({ ...previous, [platform]: undefined }));
      } else if (kind === "notifications" && typeof value === "boolean") {
        await messengerApi.notifications(platform, value);
      }
      // Дожидаемся старого опроса, затем читаем состояние после мутации.
      if (fetching.current) await fetching.current;
      await refresh();
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error ? e.message : "Не удалось обновить подключение",
        );
    } finally {
      if (mounted.current) setBusy(null);
    }
  }

  return { items, loading, refreshing, error, busy, links, refresh, action };
}
