"use client";

import { useEffect, useState } from "react";
import type { RequestProDto } from "@/entities/request";
import { fetchRequestList } from "../lib/fetch-request-list";
import {
  emptyRequestListStageCounts,
  readCachedStageCounts,
  readRequestListCache,
  type RequestListStageCounts,
} from "../lib/request-list-cache";
import type { RequestListStage } from "../lib/request-list-stage";

export function useRequestList(serviceId: string | null) {
  const [stage, setStage] = useState<RequestListStage>("NEW");
  const [requests, setRequests] = useState<RequestProDto[] | null>(() =>
    readRequestListCache({ serviceId, stage: "NEW" }),
  );
  const [counts, setCounts] = useState<RequestListStageCounts>(
    () => readCachedStageCounts(serviceId) ?? emptyRequestListStageCounts(),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const query = { serviceId, stage };
    const cachedItems = readRequestListCache(query);
    const cachedCounts = readCachedStageCounts(serviceId);
    if (cachedItems && cachedCounts) {
      setRequests(cachedItems);
      setCounts(cachedCounts);
      setError(null);
      return;
    }

    setRequests(null);
    setError(null);
    fetchRequestList(query)
      .then((feed) => {
        if (cancelled) return;
        setRequests(feed.items);
        setCounts(feed.counts);
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
  }, [serviceId, stage]);

  function selectStage(next: RequestListStage) {
    setStage((current) => (current === next ? current : next));
  }

  return {
    stage,
    selectStage,
    requests,
    counts,
    error,
    isLoading: requests === null && error === null,
  };
}
