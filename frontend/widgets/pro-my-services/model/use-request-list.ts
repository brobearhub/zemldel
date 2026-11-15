"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatReplyPreview } from "@/entities/request";
import { fetchRequestList } from "../lib/fetch-request-list";
import { withoutCompletedRequests } from "../lib/open-request-feed";
import { RequestFeedRateLimitError } from "../lib/request-feed-rate-limit";
import {
  invalidateRequestListCache,
  readRequestListCache,
  type RequestListFeed,
} from "../lib/request-list-cache";
import { useFreeRequestNotifications } from "./FreeRequestNotificationsProvider";
import { useRequestFeedRateLimit } from "./use-request-feed-rate-limit";

export function useRequestList(serviceId: string | null, search = "") {
  const normalizedSearch = search.trim().replace(/\s+/g, " ");
  const key = JSON.stringify([serviceId, normalizedSearch]);
  const [view, setView] = useState<{
    key: string;
    feed: RequestListFeed | null;
  }>(() => ({
    key,
    feed: readRequestListCache({
      serviceId,
      search: normalizedSearch,
      limit: 3,
    }),
  }));
  const [error, setError] = useState<string | null>(null);
  const [rateLimitReached, setRateLimitReached] = useState(false);
  const retryAfterSeconds = useRequestFeedRateLimit();
  const [hasPendingRequests, setHasPendingRequests] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const visibleRef = useRef(view.feed);
  const loadRef = useRef<((mode: "manual" | "more") => Promise<void>) | null>(
    null,
  );
  const { getLatestMarker, markSeen } = useFreeRequestNotifications();

  useEffect(() => {
    let cancelled = false;
    let notificationVersion = 0;
    let busy = false;
    let queuedRefresh = false;
    let loadedPageCount = 1;
    const query = { serviceId, search: normalizedSearch, limit: 3 };
    const free = serviceId === null;
    const cached = readRequestListCache(query);
    visibleRef.current = cached;
    setView({ key, feed: cached });
    setError(null);
    setRateLimitReached(false);
    setHasPendingRequests(false);
    setIsRefreshing(false);
    setIsLoadingMore(false);

    const publish = (feed: RequestListFeed) => {
      visibleRef.current = feed;
      setView({ key, feed });
    };
    const load = async (mode: "initial" | "background" | "manual" | "more") => {
      if (busy) {
        if (mode === "background") queuedRefresh = true;
        return;
      }
      const previous = visibleRef.current;
      if (mode === "more" && (!previous?.hasMore || !previous.nextCursor))
        return;
      busy = true;
      if (mode === "more") setIsLoadingMore(true);
      else if (mode === "manual") setIsRefreshing(true);
      const startedAtVersion = notificationVersion;
      const marker = getLatestMarker();
      try {
        if (mode === "more") {
          const next = await fetchRequestList(
            { ...query, cursor: previous!.nextCursor!, limit: 5 },
            Date.now(),
            true,
          );
          if (cancelled) return;
          loadedPageCount++;
          const current = visibleRef.current ?? previous!;
          const ids = new Set(current.items.map((row) => row.id));
          publish({
            ...next,
            items: [
              ...current.items,
              ...next.items.filter((row) => !ids.has(row.id)),
            ],
          });
        } else {
          let incoming =
            mode === "initial" && !free
              ? await fetchRequestList(query)
              : await fetchRequestList(query, Date.now(), true);
          // Refresh only as many pages as the user has already opened.
          const targetPages = mode === "background" ? loadedPageCount : 1;
          let pageCount = 1;
          const cursors = new Set<string>();
          while (
            !cancelled &&
            pageCount < targetPages &&
            incoming.hasMore &&
            incoming.nextCursor &&
            !cursors.has(incoming.nextCursor)
          ) {
            cursors.add(incoming.nextCursor);
            const next = await fetchRequestList(
              { ...query, cursor: incoming.nextCursor, limit: 5 },
              Date.now(),
              true,
            );
            pageCount++;
            const ids = new Set(incoming.items.map((row) => row.id));
            incoming = {
              ...next,
              items: [
                ...incoming.items,
                ...next.items.filter((row) => !ids.has(row.id)),
              ],
            };
          }
          if (cancelled) return;
          loadedPageCount = pageCount;
          if (free && mode === "background" && previous) {
            const ids = new Set(previous.items.map((row) => row.id));
            if (incoming.items.some((row) => !ids.has(row.id)))
              setHasPendingRequests(true);
            const byId = new Map(incoming.items.map((row) => [row.id, row]));
            // Keep the reading order; closed/removed rows disappear immediately.
            publish({
              ...incoming,
              items: previous.items.flatMap((row) => {
                const updated = byId.get(row.id);
                return updated ? [updated] : [];
              }),
            });
          } else {
            publish({
              ...incoming,
              items: withoutCompletedRequests(incoming.items),
            });
            setHasPendingRequests(startedAtVersion !== notificationVersion);
            if (free && !normalizedSearch) markSeen(marker);
          }
        }
        setError(null);
        setRateLimitReached(false);
      } catch (reason) {
        if (!cancelled && reason instanceof RequestFeedRateLimitError) {
          setRateLimitReached(true);
          setError(null);
        } else if (!cancelled) {
          setError(
            reason instanceof Error && reason.message.trim()
              ? reason.message
              : "Не удалось загрузить заявки",
          );
        }
      } finally {
        busy = false;
        if (!cancelled) {
          setIsRefreshing(false);
          setIsLoadingMore(false);
          if (queuedRefresh) {
            queuedRefresh = false;
            void load("background");
          }
        }
      }
    };
    const invoke = (mode: "manual" | "more") => load(mode);
    loadRef.current = invoke;
    // Search requests are debounced; clearing the search restores the first page immediately.
    const timer =
      cached && !free
        ? null
        : window.setTimeout(
            () => void load("initial"),
            normalizedSearch ? 250 : 0,
          );
    const refresh = () => {
      invalidateRequestListCache(query);
      if (document.visibilityState === "visible") void load("background");
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
      if (timer !== null) window.clearTimeout(timer);
      if (loadRef.current === invoke) loadRef.current = null;
      window.removeEventListener("request:changed", refresh);
      window.removeEventListener("request:sync", refresh);
      if (free) window.removeEventListener("free-request:created", queueNew);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [serviceId, normalizedSearch, key, getLatestMarker, markSeen]);

  const showNewRequests = useCallback(() => loadRef.current?.("manual"), []);
  const loadMore = useCallback(() => loadRef.current?.("more"), []);

  function markAwaitingCustomerReply(requestId: string, body: string) {
    const current = visibleRef.current;
    if (!current) return;
    const providerLastMessage = formatReplyPreview(body);
    const changed = current.items.some(
      (row) => row.id === requestId && !row.awaitingCustomerReply,
    );
    const next = {
      ...current,
      needsReply: Math.max(0, current.needsReply - Number(changed)),
      items: current.items.map((row) =>
        row.id === requestId
          ? {
              ...row,
              awaitingCustomerReply: true,
              providerLastMessage:
                providerLastMessage ?? row.providerLastMessage,
              lastMessageAt: new Date().toISOString(),
            }
          : row,
      ),
    };
    visibleRef.current = next;
    setView({ key, feed: next });
    invalidateRequestListCache({ serviceId });
  }

  const feed = view.key === key ? view.feed : null;
  return {
    requests: feed?.items ?? null,
    total: feed?.total ?? 0,
    needsReply: feed?.needsReply ?? 0,
    hasMore: feed?.hasMore ?? false,
    error,
    rateLimitReached: rateLimitReached || retryAfterSeconds > 0,
    retryAfterSeconds,
    isLoading:
      feed === null && error === null && !rateLimitReached && retryAfterSeconds === 0,
    hasPendingRequests,
    isRefreshing,
    isLoadingMore,
    showNewRequests,
    loadMore,
    markAwaitingCustomerReply,
  };
}
