"use client";

import { useEffect, useState } from "react";
import { readPendingRequestDraft, REQUEST_INTENT, type PendingRequestDraft } from "@/entities/request";

export function usePendingRequestContext(input: {
  intent: string | null;
  kind: string | null;
  serviceId: string | null;
  categoryId: string | null;
}) {
  const [draft, setDraft] = useState<PendingRequestDraft | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { intent, kind, serviceId, categoryId } = input;

  useEffect(() => {
    const saved = intent === REQUEST_INTENT ? readPendingRequestDraft() : null;
    const matches = saved && (!kind || saved.kind === kind) &&
      (saved.kind !== "SERVICE" || !serviceId || saved.serviceId === serviceId) &&
      (saved.kind !== "CATEGORY" || !categoryId || saved.categoryId === categoryId);
    setDraft(matches ? saved : null);
    setLoaded(true);
  }, [intent, kind, serviceId, categoryId]);

  return { draft, loaded };
}
