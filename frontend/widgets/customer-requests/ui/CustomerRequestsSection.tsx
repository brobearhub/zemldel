"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import {
  clearPendingRequestDraft,
  isPendingRequestSubmitting,
  markPendingRequestFailed,
  markPendingRequestSubmitting,
  readPendingRequestDraft,
  type PendingRequestDraft,
  getRequestStatusLabel,
  isExclusiveProviderPhaseStatus,
  isOpenRequestStatus,
  type RequestCustomerDto,
  type RequestStatus,
} from "@/entities/request";

type PhaseFilter = "ALL" | "DISCUSSING" | "ORDERS" | "COMPLETED" | "CANCELLED";

const PHASE_TABS: { id: PhaseFilter; label: string }[] = [
  { id: "ALL", label: "Все" },
  { id: "DISCUSSING", label: "В обсуждении" },
  { id: "ORDERS", label: "Заказы" },
  { id: "COMPLETED", label: "Завершённые" },
  { id: "CANCELLED", label: "Отменённые" },
];

function matchesPhase(status: RequestStatus, phase: PhaseFilter): boolean {
  if (phase === "ALL") return true;
  if (phase === "DISCUSSING") return !isExclusiveProviderPhaseStatus(status) && isOpenRequestStatus(status);
  if (phase === "ORDERS") return isExclusiveProviderPhaseStatus(status) && isOpenRequestStatus(status);
  if (phase === "COMPLETED") return status === "COMPLETED";
  if (phase === "CANCELLED") return status === "CANCELLED" || status === "CLOSED";
  return true;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

type Props = {
  autoResumeEnabled?: boolean;
  onAutoResumeFinished?: () => void;
};

export function CustomerRequestsSection({ autoResumeEnabled = false, onAutoResumeFinished }: Props) {
  const [items, setItems] = useState<RequestCustomerDto[]>([]);
  const [phase, setPhase] = useState<PhaseFilter>("ALL");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
              }
            : draft.kind === "CATEGORY"
              ? { message: draft.message, requestCityId: draft.requestCityId }
              : { message: draft.message, requestCityId: draft.requestCityId };

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(payload?.error ?? "Не удалось создать заявку");
        }

        clearPendingRequestDraft();
        if (!cancelled) {
          await load();
          onAutoResumeFinished?.();
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
  }, [autoResumeEnabled, onAutoResumeFinished]);

  const filteredItems = useMemo(
    () => items.filter((item) => matchesPhase(item.status, phase)),
    [items, phase]
  );

  const phaseCounts = useMemo(
    () =>
      Object.fromEntries(
        PHASE_TABS.map((t) => [t.id, items.filter((item) => matchesPhase(item.status, t.id)).length])
      ) as Record<PhaseFilter, number>,
    [items]
  );

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
        <Stack spacing={0.25}>
          <Typography variant="h5" fontWeight={900}>
            Заявки
          </Typography>
        </Stack>
        <Button variant="outlined" onClick={() => void load()} disabled={loading} sx={{ whiteSpace: "nowrap" }}>
          Обновить
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {PHASE_TABS.map((t) => (
          <Chip
            key={t.id}
            label={`${t.label}${phaseCounts[t.id] > 0 ? ` · ${phaseCounts[t.id]}` : ""}`}
            color={phase === t.id ? "primary" : "default"}
            variant={phase === t.id ? "filled" : "outlined"}
            onClick={() => setPhase(t.id)}
          />
        ))}
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {items.length === 0 && !loading ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography fontWeight={800} gutterBottom>
            Пока нет заявок
          </Typography>
          <Typography color="text.secondary">
            Вы можете создать свободную заявку на главной странице и она появится в ленте провайдеров.
          </Typography>
          <Button component={Link} href="/" sx={{ mt: 2 }} variant="contained">
            На главную
          </Button>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {filteredItems.length === 0 && !loading ? (
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Typography color="text.secondary">
                Нет заявок в этой категории.
              </Typography>
            </Paper>
          ) : null}
          {filteredItems.map((item) => (
            <Paper key={item.id} variant="outlined" sx={{ p: 2.5 }}>
              <Stack spacing={1}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between" sx={{ width: "100%" }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                      <Typography variant="overline" color="text.secondary">
                        {item.subjectType === "FREEFORM"
                          ? "Свободная заявка"
                          : item.subjectType === "CATEGORY"
                            ? "Заявка по категории"
                            : item.serviceTitle ?? "Заявка по услуге"}
                      </Typography>
                      <Chip size="small" label={getRequestStatusLabel(item.status)} />
                    </Stack>

                    <Button
                      component={Link}
                      href={`/profile/requests/${item.id}`}
                      size="small"
                      variant="outlined"
                      disabled={item.status === "CLOSED"}
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      Открыть
                    </Button>
                  </Stack>
                </Stack>

                {item.providerName ? (
                  <Typography variant="body2" color="text.secondary">
                    Исполнитель: {item.providerName}
                  </Typography>
                ) : null}
                {item.location ? (
                  <Typography variant="body2" color="text.secondary">
                    Локация: {item.location}
                  </Typography>
                ) : null}
                {item.message ? <Typography color="text.primary" fontWeight={600}>{item.message}</Typography> : null}
                <Typography variant="caption" color="text.secondary">
                  {formatDate(item.createdAt)}
                </Typography>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
