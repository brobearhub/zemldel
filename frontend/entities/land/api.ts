"use client";
import { useCallback, useEffect, useState } from "react";
export class LandApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
export async function landApi<T>(path = "", init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/lands${path}`, {
    cache: "no-store",
    ...init,
    headers:
      init?.body instanceof FormData
        ? init.headers
        : { "Content-Type": "application/json", ...init?.headers },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok)
    throw new LandApiError(
      typeof result?.message === "string"
        ? result.message
        : "Не удалось выполнить действие. Попробуйте ещё раз.",
      response.status,
      result?.fields ?? {},
    );
  return result as T;
}
export function useLandData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    landApi<T>(path, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) {
          setData(value);
          setLoadedPath(path);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, revision]);
  return { data, setData, loadedPath, error, loading, refresh };
}
