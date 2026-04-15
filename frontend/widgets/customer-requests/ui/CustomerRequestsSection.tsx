"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import {
  clearPendingServiceRequestDraft,
  isPendingServiceRequestSubmitting,
  markPendingServiceRequestFailed,
  markPendingServiceRequestSubmitting,
  readPendingServiceRequestDraft,
  type PendingServiceRequestDraft,
  getServiceRequestStatusLabel,
  type ServiceRequestCustomerDto,
} from "@/entities/service-request";

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
};

export function CustomerRequestsSection({ autoResumeEnabled = false }: Props) {
  const [items, setItems] = useState<ServiceRequestCustomerDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const visibleItems = useMemo(() => {
    // "Заявки" — только до конверсии в заказ. Заказные статусы показываются в разделе "Заказы".
    return items.filter(
      (i) =>
        i.status !== "ACTIVE" &&
        i.status !== "COMPLETED" &&
        i.status !== "CANCELLED" &&
        i.status !== "CONVERTED_TO_ORDER"
    );
  }, [items]);

  const byKind = useMemo(() => {
    const freeform = visibleItems.filter((i) => i.subjectType === "FREEFORM");
    const category = visibleItems.filter((i) => i.subjectType === "CATEGORY");
    const service = visibleItems.filter((i) => i.subjectType === "SERVICE");
    return { freeform, category, service };
  }, [visibleItems]);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/service-requests", { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as ServiceRequestCustomerDto[] | { error?: string } | null;
      if (!res.ok) {
        throw new Error(
          payload && typeof payload === "object" && !Array.isArray(payload) && payload.error
            ? payload.error
            : "Не удалось загрузить заявки"
        );
      }
      setItems(payload as ServiceRequestCustomerDto[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить заявки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!autoResumeEnabled) return;

    let cancelled = false;

    async function resume(draft: PendingServiceRequestDraft) {
      if (isPendingServiceRequestSubmitting(draft)) {
        return;
      }
      markPendingServiceRequestSubmitting();

      try {
        const url =
          draft.kind === "SERVICE"
            ? `/api/services/${draft.serviceId}/requests`
            : draft.kind === "CATEGORY"
              ? `/api/service-categories/${draft.categoryId}/requests`
              : "/api/service-requests";

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

        clearPendingServiceRequestDraft();
        if (!cancelled) await load();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Не удалось создать заявку";
        markPendingServiceRequestFailed(msg);
        if (!cancelled) setError(msg);
      }
    }

    const draft = readPendingServiceRequestDraft();
    if (draft) {
      void resume(draft);
    }

    return () => {
      cancelled = true;
    };
  }, [autoResumeEnabled]);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
        <Stack spacing={0.25}>
          <Typography variant="h5" fontWeight={900}>
            Заявки
          </Typography>
          <Typography variant="body2" color="text.secondary">
              Ваши заявки: свободные, по категориям и по услугам провайдеров.
          </Typography>
        </Stack>
        <Button variant="outlined" onClick={() => void load()} disabled={loading} sx={{ whiteSpace: "nowrap" }}>
          Обновить
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {visibleItems.length === 0 ? (
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
          {[...byKind.freeform, ...byKind.category, ...byKind.service].map((item) => (
            <Paper key={item.id} variant="outlined" sx={{ p: 2.5 }}>
              <Stack spacing={1}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between" sx={{ width: "100%" }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                      <Typography fontWeight={800}>
                        {item.subjectType === "FREEFORM"
                          ? "Свободная заявка"
                          : item.subjectType === "CATEGORY"
                            ? "Заявка по категории"
                            : "Заявка по услуге"}
                      </Typography>
                      <Chip size="small" label={getServiceRequestStatusLabel(item.status)} />
                    </Stack>

                    <Button
                      component={Link}
                      href={`/profile/requests/${item.id}`}
                      size="small"
                      variant="outlined"
                      disabled={item.status === "CLOSED"}
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      Обсуждение
                    </Button>
                  </Stack>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Создано: {formatDate(item.createdAt)}
                </Typography>
                {item.location ? (
                  <Typography variant="body2" color="text.secondary">
                    Локация: {item.location}
                  </Typography>
                ) : null}
                {item.message ? <Typography color="text.secondary">{item.message}</Typography> : null}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

