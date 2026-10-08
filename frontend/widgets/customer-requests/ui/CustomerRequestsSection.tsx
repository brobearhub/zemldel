"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import {
  clearPendingRequestDraft,
  isPendingRequestSubmitting,
  markPendingRequestFailed,
  markPendingRequestSubmitting,
  readPendingRequestDraft,
  type PendingRequestDraft,
  type RequestCustomerDto,
} from "@/entities/request";
import type { ChatEnsureResponse } from "@/entities/chat/dto/chat.dto";
import { deleteCustomerRequest } from "@/entities/request/api/customer-requests";
import { useConfirm } from "@/shared/ui/confirm";
import { DEFAULT_SERVICE_QUESTION } from "@/features/create-service-request-lead";
import { CustomerRequestsBoard } from "./CustomerRequestsBoard";

type Props = {
  autoResumeEnabled?: boolean;
  onAutoResumeFinished?: () => void;
};

export function CustomerRequestsSection({ autoResumeEnabled = false, onAutoResumeFinished }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState<RequestCustomerDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load(signal?: AbortSignal) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/requests", { cache: "no-store", signal });
      const payload = (await res.json().catch(() => null)) as RequestCustomerDto[] | { error?: string } | null;
      if (!res.ok) {
        throw new Error(
          payload && typeof payload === "object" && !Array.isArray(payload) && payload.error
            ? payload.error
            : "Не удалось загрузить заявки"
        );
      }
      setItems(payload as RequestCustomerDto[]);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return;
      }
      setError(e instanceof Error ? e.message : "Не удалось загрузить заявки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!autoResumeEnabled) return;

    let cancelled = false;

    async function resume(draft: PendingRequestDraft) {
      if (isPendingRequestSubmitting(draft)) {
        if (!cancelled) {
          await load();
          onAutoResumeFinished?.();
        }
        return;
      }
      markPendingRequestSubmitting();

      try {
        const url =
          draft.kind === "SERVICE"
            ? `/api/services/${draft.serviceId}/requests`
            : draft.kind === "CATEGORY"
              ? `/api/service-categories/${draft.categoryId}/requests`
              : "/api/requests";

        const body =
          draft.kind === "SERVICE"
            ? {
                customerName: draft.customerName,
                customerEmail: draft.customerEmail,
                customerPhone: draft.customerPhone,
                message: draft.message,
                requestCityId: draft.requestCityId,
                cadastralNumbers: draft.cadastralNumbers,
              }
            : draft.kind === "CATEGORY"
              ? {
                  message: draft.message,
                  requestCityId: draft.requestCityId,
                  cadastralNumbers: draft.cadastralNumbers,
                }
              : {
                  message: draft.message,
                  requestCityId: draft.requestCityId,
                  cadastralNumbers: draft.cadastralNumbers,
                };

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const payload = (await res.json().catch(() => null)) as RequestCustomerDto | { error?: string } | null;
        if (!res.ok || !payload || typeof payload !== "object" || ("error" in payload && payload.error)) {
          const errorMessage =
            payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
              ? payload.error
              : "Не удалось создать заявку";
          throw new Error(errorMessage);
        }

        const created = payload as RequestCustomerDto;

        // Ensure chat + send first message for SERVICE requests (so provider thread appears immediately).
        if (draft.kind === "SERVICE") {
          const message = (draft.message ?? "").trim() || DEFAULT_SERVICE_QUESTION;
          try {
            const ensureRes = await fetch("/api/chat/ensure", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ serviceRequestId: created.id }),
            });
            const ensured = (await ensureRes.json().catch(() => null)) as ChatEnsureResponse | { error?: string } | null;
            if (ensureRes.ok && ensured && typeof ensured === "object" && "conversationId" in ensured) {
              await fetch(`/api/chat/conversations/${(ensured as ChatEnsureResponse).conversationId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body: message, clientMessageId: crypto.randomUUID() }),
              }).catch(() => null);
            }
          } catch {
            // Fallback: request detail page can ensure chat manually.
          }
        }

        clearPendingRequestDraft();
        if (!cancelled) {
          router.push(`/profile/requests/${created.id}`);
          router.refresh();
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Не удалось создать заявку";
        markPendingRequestFailed(msg);
        if (!cancelled) setError(msg);
      }
    }

    const draft = readPendingRequestDraft();
    if (draft) {
      void resume(draft);
    }

    return () => {
      cancelled = true;
    };
  }, [autoResumeEnabled, onAutoResumeFinished, router]);

  function openRequest(item: RequestCustomerDto) {
    if (item.status === "CLOSED") return;
    router.push(`/profile/requests/${item.id}`);
  }

  async function deleteRequest(item: RequestCustomerDto) {
    const confirmed = await confirm({
      title: "Удалить заявку?",
      description: "Заявка будет удалена безвозвратно. Это можно сделать только пока ни один исполнитель не ответил.",
      confirmText: "Удалить",
      confirmColor: "error",
    });
    if (!confirmed) return;

    setDeletingId(item.id);
    setError(null);
    try {
      await deleteCustomerRequest(item.id);
      setItems((current) => current.filter((row) => row.id !== item.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить заявку");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <Button variant="outlined" onClick={() => void load()} disabled={loading} sx={{ whiteSpace: "nowrap" }}>
          Обновить
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {items.length === 0 && !loading ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography gutterBottom sx={{
            fontWeight: 800
          }}>
            Пока нет заявок
          </Typography>
          <Typography sx={{
            color: "text.secondary"
          }}>
            Вы можете создать свободную заявку на главной странице и она появится в ленте провайдеров.
          </Typography>
          <Button component={Link} href="/" sx={{ mt: 2 }} variant="contained">
            На главную
          </Button>
        </Paper>
      ) : (
        <CustomerRequestsBoard
          items={items}
          deletingId={deletingId}
          onOpen={openRequest}
          onDelete={(item) => void deleteRequest(item)}
        />
      )}
    </Stack>
  );
}
