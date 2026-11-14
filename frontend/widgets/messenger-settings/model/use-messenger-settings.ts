"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  messengerApi,
  MessengerRequestError,
} from "@/entities/messenger/api/messengers";
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
  const revision = useRef(0);
  const busyRef = useRef<string | null>(null);
  const actionError = useRef<{
    platform: MessengerPlatform;
    message: string;
    connected: boolean | undefined;
    pendingId: string | undefined;
  } | null>(null);
  const fetching = useRef<{
    revision: number;
    promise: Promise<MessengerStatus[] | null>;
  } | null>(null);

  const refresh = useCallback(
    (options?: {
      afterAction?: boolean;
      errorMessage?: string;
    }): Promise<MessengerStatus[] | null> => {
      if (busyRef.current && !options?.afterAction) return Promise.resolve(null);
      if (fetching.current?.revision === revision.current)
        return fetching.current.promise;
      const currentRevision = revision.current;
      const isCurrent = () =>
        mounted.current && revision.current === currentRevision;
      if (mounted.current) setRefreshing(true);
      const pending = (async () => {
        try {
          const result = await messengerApi.status();
          if (isCurrent()) {
            setItems(result);
            const failed = actionError.current;
            if (failed) {
              const current = result.find(
                (item) => item.platform === failed.platform,
              );
              if (
                current?.connected !== failed.connected ||
                current?.pending?.id !== failed.pendingId
              )
                actionError.current = null;
            }
            setError(actionError.current?.message ?? null);
            return result;
          }
        } catch {
          if (isCurrent())
            setError(
              options?.errorMessage ??
                "Не удалось загрузить данные о подключении мессенджеров. Попробуйте ещё раз.",
            );
        } finally {
          if (isCurrent()) {
            setLoading(false);
            setRefreshing(false);
          }
        }
        return null;
      })();
      fetching.current = { revision: currentRevision, promise: pending };
      void pending.then(() => {
        if (fetching.current?.promise === pending) fetching.current = null;
      });
      return pending;
    },
    [],
  );

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const focus = () => {
      void refresh();
    };
    window.addEventListener("focus", focus);
    return () => {
      mounted.current = false;
      revision.current += 1;
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
    if (busyRef.current) return;
    busyRef.current = `${platform}:${kind}`;
    revision.current += 1;
    setBusy(busyRef.current);
    setRefreshing(false);
    actionError.current = null;
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
      if (!mounted.current) return;
      // Apply only a confirmed mutation. A slow background GET from before the
      // mutation is invalidated by revision and cannot restore stale state.
      setItems((previous) =>
        previous.map((item) => {
          if (item.platform !== platform) return item;
          if (kind === "disconnect")
            return {
              ...item,
              connected: false,
              displayName: null,
              pending: null,
              blocked: false,
              notificationsEnabled: false,
            };
          if (kind === "confirm")
            return {
              ...item,
              connected: true,
              displayName: item.pending?.displayName ?? item.displayName,
              pending: null,
              notificationsEnabled: true,
              blocked: false,
            };
          if (kind === "notifications" && typeof value === "boolean")
            return { ...item, notificationsEnabled: value };
          return item;
        }),
      );
      await refresh({
        afterAction: true,
        errorMessage:
          "Изменение сохранено, но не удалось обновить статус. Нажмите «Повторить».",
      });
    } catch (e) {
      if (!mounted.current) return;
      const message =
        e instanceof MessengerRequestError &&
        e.status >= 400 &&
        e.status < 500 &&
        /[а-яё]/i.test(e.message)
          ? e.message
          : "Не удалось обновить подключение. Попробуйте ещё раз.";
      // A failed response can follow a committed mutation or a change in another
      // tab. Read canonical state before keeping a stale connection toggle.
      const latest = await refresh({
        afterAction: true,
        errorMessage: "Не удалось обновить статус подключения. Нажмите «Повторить».",
      });
      if (!mounted.current) return;
      const alreadyConnected =
        e instanceof MessengerRequestError &&
        e.status === 409 &&
        (!e.code ||
          (kind === "link" && e.code === "MESSENGER_ALREADY_CONNECTED")) &&
        ["link", "confirm"].includes(kind) &&
        latest?.some((item) => item.platform === platform && item.connected);
      if (alreadyConnected) {
        setLinks((previous) => ({ ...previous, [platform]: undefined }));
        setError(null);
      } else {
        const current = (latest ?? items).find(
          (item) => item.platform === platform,
        );
        actionError.current = {
          platform,
          message,
          connected: current?.connected,
          pendingId: current?.pending?.id,
        };
        setError(message);
      }
    } finally {
      busyRef.current = null;
      if (mounted.current) setBusy(null);
    }
  }

  return { items, loading, refreshing, error, busy, links, refresh, action };
}
