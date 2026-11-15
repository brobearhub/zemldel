"use client";

import { useCallback, useEffect, useState } from "react";
import {
  documentRequest,
  type ProviderDocumentLibrary,
} from "@/entities/provider-document/api/documents";

export function useDocumentLibrary() {
  const [data, setData] = useState<ProviderDocumentLibrary>({
    files: [],
    folders: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void documentRequest<ProviderDocumentLibrary>("", {
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Не удалось загрузить документы.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);
  return { ...data, loading, error, reload };
}
