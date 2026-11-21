"use client";

import { fetchIdempotentWrite } from "@/shared/api/idempotent-write";
import { sendInitialServiceMessage } from "./send-initial-service-message";

import {
  isPendingRequestSubmitting,
  markPendingRequestCreated,
  markPendingRequestFailed,
  markPendingRequestSubmitting,
  type PendingRequestDraft,
} from "../pending-request";

type CreatedRequest = { id: string };
const inFlight = new Map<string, Promise<CreatedRequest>>();
export class PendingRequestAuthRequiredError extends Error {}

/** Reuse the same submission across React remounts; save the ID before chat follow-ups. */
export function resumePendingRequest(draft: PendingRequestDraft, fetcher: typeof fetch = fetch): Promise<CreatedRequest> {
  const key = draft.draftId ?? JSON.stringify([draft.kind, "serviceId" in draft ? draft.serviceId : "categoryId" in draft ? draft.categoryId : null, draft.message, draft.requestCityId, draft.cadastralNumbers]);
  const existing = inFlight.get(key);
  if (existing) return existing;
  if (isPendingRequestSubmitting(draft)) {
    return Promise.reject(new Error("Отправка уже началась. Подождите несколько секунд и нажмите «Повторить отправку»."));
  }

  const task = (async () => {
    markPendingRequestSubmitting();
    try {
      let created: CreatedRequest;
      if (draft.createdRequestId) {
        created = { id: draft.createdRequestId };
      } else {
        const url = draft.kind === "SERVICE"
          ? `/api/services/${draft.serviceId}/requests`
          : draft.kind === "CATEGORY" ? `/api/service-categories/${draft.categoryId}/requests` : "/api/requests";
        const body = {
          message: draft.message,
          requestCityId: draft.requestCityId,
          cadastralNumbers: draft.cadastralNumbers,
          ...(draft.kind === "SERVICE" ? {
            customerName: draft.customerName,
            customerEmail: draft.customerEmail,
            customerPhone: draft.customerPhone,
          } : {}),
        };
        const response = await (fetcher === fetch ? fetchIdempotentWrite : fetcher)(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const payload = await response.json().catch(() => null) as { id?: string; error?: string } | null;
        if (!response.ok || !payload?.id) {
          if (response.status === 401) throw new PendingRequestAuthRequiredError("Сессия завершилась. Войдите ещё раз — заявка сохранена.");
          throw new Error(payload?.error ?? "Не удалось отправить заявку. Черновик сохранён.");
        }
        created = { id: payload.id };
        try { markPendingRequestCreated(created.id, draft.draftId); } catch { /* A successful creation must still open its detail page. */ }
      }
      if (draft.kind === "SERVICE") {
        await sendInitialServiceMessage(created.id, draft.message, fetcher);
      }
      return created;
    } catch (error) {
      markPendingRequestFailed(error instanceof Error ? error.message : "Не удалось отправить заявку", draft.draftId);
      throw error;
    }
  })();
  inFlight.set(key, task);
  void task.then(() => inFlight.delete(key), () => inFlight.delete(key));
  return task;
}
