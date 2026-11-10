"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatReplyPreview, type RequestProDto } from "@/entities/request";
import { fetchRequestList } from "../lib/fetch-request-list";
import { withoutCompletedRequests } from "../lib/open-request-feed";
import {
  invalidateRequestListCache,
  readRequestListCache,
  writeRequestListCache,
} from "../lib/request-list-cache";
import { useFreeRequestNotifications } from "./FreeRequestNotificationsProvider";

function readOpenRequestList(serviceId: string | null): RequestProDto[] | null {
  const cached = readRequestListCache({ serviceId });
  return cached ? withoutCompletedRequests(cached) : null;
}

export function useRequestList(serviceId: string | null) {
  const [requests, setRequests] = useState<RequestProDto[] | null>(() =>
    readOpenRequestList(serviceId),
  );
  const [error, setError] = useState<string | null>(null);
  const [hasPendingRequests, setHasPendingRequests] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const visibleRef = useRef(requests);
  const loadRef = useRef<(() => Promise<void>) | null>(null);
  const { getLatestMarker, markSeen } = useFreeRequestNotifications();

  useEffect(() => {
    let cancelled = false;
    let notificationVersion = 0;
    let revision = 0;
    let manualBusy = false;
    let backgroundBusy = false;
    const query = { serviceId };
    const free = serviceId === null;
    let visible = readOpenRequestList(serviceId);
    visibleRef.current = visible;
    setRequests(visible);
    setError(null);
    setHasPendingRequests(false);
    setIsRefreshing(false);

    const load = async (force = false, manual = false, initial = false) => {
      if (manualBusy || (!manual && backgroundBusy)) return;
      if (manual) {
        manualBusy = true;
        setIsRefreshing(true);
      } else backgroundBusy = true;
      const ownRevision = ++revision;
      const startedAtVersion = notificationVersion;
      const marker = getLatestMarker();
      const replace = !free || manual || initial || visible === null;
      try {
        const feed = await (force
          ? fetchRequestList(query, Date.now(), true)
          : fetchRequestList(query));
        if (cancelled || ownRevision !== revision) {
          invalidateRequestListCache(query);
          return;
        }
        const incoming = withoutCompletedRequests(feed.items);
        if (replace) {
          visible = free
            ? [...incoming].sort(
                (a, b) =>
                  Number(a.awaitingCustomerReply) -
                    Number(b.awaitingCustomerReply) ||
                  Number(b.status === "NEW") - Number(a.status === "NEW"),
              )
            : incoming;
          setHasPendingRequests(startedAtVersion !== notificationVersion);
          if (free) markSeen(marker);
        } else {
          const previous = visibleRef.current ?? [];
          const ids = new Set(previous.map((row) => row.id));
          if (incoming.some((row) => !ids.has(row.id)))
            setHasPendingRequests(true);
          const byId = new Map(incoming.map((row) => [row.id, row]));
          // Keep the current rows and their order while the user is reading.
          visible = previous.map((row) => byId.get(row.id) ?? row);
        }
        if (startedAtVersion !== notificationVersion)
          invalidateRequestListCache(query);
        visibleRef.current = visible;
        setRequests(visible);
        setError(null);
      } catch (reason) {
        if (cancelled || ownRevision !== revision) return;
        setError(
          reason instanceof Error && reason.message.trim()
            ? reason.message
            : "Не удалось загрузить заявки",
        );
      } finally {
        if (manual) {
          manualBusy = false;
          if (!cancelled) setIsRefreshing(false);
        } else backgroundBusy = false;
      }
    };
    const showNew = () => load(true, true);
    loadRef.current = showNew;
    if (visible === null) void load();
    else if (free) void load(true, false, true);
    const refresh = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    const queueNew = () => {
      notificationVersion++;
      setHasPendingRequests(true);
    };
    window.addEventListener("request:changed", refresh);
    window.addEventListener("request:sync", refresh);
    if (free) window.addEventListener("free-request:created", queueNew);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      if (loadRef.current === showNew) loadRef.current = null;
      window.removeEventListener("request:changed", refresh);
      window.removeEventListener("request:sync", refresh);
      if (free) window.removeEventListener("free-request:created", queueNew);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [serviceId, getLatestMarker, markSeen]);

  const showNewRequests = useCallback(() => loadRef.current?.(), []);

  function markAwaitingCustomerReply(requestId: string, body: string) {
    const providerLastMessage = formatReplyPreview(body);
    setRequests((current) => {
      if (!current) return current;
      const next = current.map((row) =>
        row.id === requestId
          ? {
              ...row,
              awaitingCustomerReply: true,
              providerLastMessage:
                providerLastMessage ?? row.providerLastMessage,
              lastMessageAt: new Date().toISOString(),
            }
          : row,
      );
      visibleRef.current = next;
      if (serviceId === null) invalidateRequestListCache({ serviceId });
      else writeRequestListCache({ serviceId }, next);
      return next;
    });
  }

  return {
    requests,
    error,
    isLoading: requests === null && error === null,
    hasPendingRequests,
    isRefreshing,
    showNewRequests,
    markAwaitingCustomerReply,
  };
}
