"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getRequestFeedRetryAt,
  subscribeRequestFeedRateLimit,
} from "../lib/request-feed-rate-limit";

export function useRequestFeedRateLimit() {
  const retryAt = useSyncExternalStore(
    subscribeRequestFeedRateLimit,
    getRequestFeedRetryAt,
    () => 0,
  );
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    setNow(Date.now());
    if (retryAt <= Date.now()) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= retryAt) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  return Math.max(0, Math.ceil((retryAt - now) / 1000));
}
