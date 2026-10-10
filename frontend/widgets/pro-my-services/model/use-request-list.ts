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
    const query = { serviceId };
    const cachedItems = readOpenRequestList(serviceId);
    if (cachedItems) {
      setRequests(cachedItems);
      setError(null);
      return;
    }

    setRequests(null);
    setError(null);
    fetchRequestList(query)
      .then((feed) => {
        if (cancelled) return;
        setRequests(withoutCompletedRequests(feed.items));
        setError(null);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setRequests(null);
        const message = reason instanceof Error ? reason.message.trim() : "";
        setError(message.length > 0 ? message : "Не удалось загрузить заявки");
      });

    return () => {
      cancelled = true;
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
