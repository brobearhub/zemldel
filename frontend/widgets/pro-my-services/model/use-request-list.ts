"use client";

import { useEffect, useState } from "react";
import { formatReplyPreview, type RequestProDto } from "@/entities/request";
import { fetchRequestList } from "../lib/fetch-request-list";
import { withoutCompletedRequests } from "../lib/open-request-feed";
import { readRequestListCache, writeRequestListCache } from "../lib/request-list-cache";

function readOpenRequestList(serviceId: string | null): RequestProDto[] | null {
  const cached = readRequestListCache({ serviceId });
  if (!cached) return null;
  return withoutCompletedRequests(cached);
}

export function useRequestList(serviceId: string | null) {
  const [requests, setRequests] = useState<RequestProDto[] | null>(() => readOpenRequestList(serviceId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let revision = 0;
    const query = { serviceId };
    const load = async (force = false) => {
      const ownRevision = ++revision;
      try {
        const feed = await (force ? fetchRequestList(query, Date.now(), true) : fetchRequestList(query));
        if (cancelled || ownRevision !== revision) return;
        setRequests(withoutCompletedRequests(feed.items)); setError(null);
      } catch (reason) {
        if (cancelled || ownRevision !== revision) return;
        setError(reason instanceof Error && reason.message.trim() ? reason.message : "Не удалось загрузить заявки");
      }
    };
    const cachedItems = readOpenRequestList(serviceId);
    setRequests(cachedItems); setError(null);
    if (!cachedItems) void load();
    const refresh = () => { if (document.visibilityState === "visible") void load(true); };
    window.addEventListener("request:changed", refresh);
    window.addEventListener("request:sync", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("request:changed", refresh);
      window.removeEventListener("request:sync", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [serviceId]);

  function markAwaitingCustomerReply(requestId: string, body: string) {
    const providerLastMessage = formatReplyPreview(body);
    setRequests((current) => {
      if (!current) return current;
      const next = current.map((row) =>
        row.id === requestId
          ? {
              ...row,
              awaitingCustomerReply: true,
              providerLastMessage: providerLastMessage ?? row.providerLastMessage,
              lastMessageAt: new Date().toISOString(),
            }
          : row,
      );
      writeRequestListCache({ serviceId }, next);
      return next;
    });
  }

  return {
    requests,
    error,
    isLoading: requests === null && error === null,
    markAwaitingCustomerReply,
  };
}
