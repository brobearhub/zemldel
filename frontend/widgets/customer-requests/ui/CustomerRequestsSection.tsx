"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Chip, IconButton, Paper, Stack, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import {
  clearPendingRequestDraft,
  isPendingRequestSubmitting,
  markPendingRequestFailed,
  markPendingRequestSubmitting,
  readPendingRequestDraft,
  type PendingRequestDraft,
  getRequestStatusLabel,
  hasRequestLock,
  isOpenRequestStatus,
  type RequestCustomerDto,
  type RequestStatus,
} from "@/entities/request";
import { deleteCustomerRequest } from "@/entities/request/api/customer-requests";
import { useConfirm } from "@/shared/ui/confirm";

type PhaseFilter = "ALL" | "DISCUSSING" | "ORDERS" | "COMPLETED" | "CANCELLED";

const PHASE_TABS: { id: PhaseFilter; label: string }[] = [
  { id: "ALL", label: "Все" },
  { id: "DISCUSSING", label: "В обсуждении" },
  { id: "ORDERS", label: "Заказы" },
  { id: "COMPLETED", label: "Завершённые" },
  { id: "CANCELLED", label: "Отменённые" },
];

function matchesPhase(item: RequestCustomerDto, phase: PhaseFilter): boolean {
  if (phase === "ALL") return true;
  if (phase === "DISCUSSING") return !hasRequestLock(item) && isOpenRequestStatus(item.status);
  if (phase === "ORDERS") return hasRequestLock(item) && isOpenRequestStatus(item.status);
  if (phase === "COMPLETED") return item.status === "COMPLETED";
  if (phase === "CANCELLED") return item.status === "CANCELLED" || item.status === "CLOSED";
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

function getSubjectSubtitle(item: RequestCustomerDto): string | null {
  if (item.subjectType === "SERVICE") {
    const title = item.serviceTitle?.trim();
    return title || "Заявка по услуге";
  }
  if (item.subjectType === "CATEGORY") {
    return "Заявка по категории";
  }
  return null;
}

function getDesktopMetaLeft(item: RequestCustomerDto): string {
  const parts: string[] = [];
  if (item.providerName) {
    parts.push(`Исполнитель: ${item.providerName}`);
  }
  if (item.location) {
    parts.push(`Локация: ${item.location}`);
  }
  return parts.join(" · ");
}

type Props = {
  autoResumeEnabled?: boolean;
  onAutoResumeFinished?: () => void;
};

export function CustomerRequestsSection({ autoResumeEnabled = false, onAutoResumeFinished }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState<RequestCustomerDto[]>([]);
  const [phase, setPhase] = useState<PhaseFilter>("ALL");
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
    () => items.filter((item) => matchesPhase(item, phase)),
    [items, phase]
  );

  const phaseCounts = useMemo(
    () =>
      Object.fromEntries(
        PHASE_TABS.map((t) => [t.id, items.filter((item) => matchesPhase(item, t.id)).length])
      ) as Record<PhaseFilter, number>,
    [items]
  );

  function openRequest(id: string, status: RequestStatus) {
    if (status === "CLOSED") return;
    router.push(`/profile/requests/${id}`);
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
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        sx={{
          justifyContent: "space-between",
          alignItems: { md: "center" }
        }}>
        <Stack spacing={0.25}>
          <Typography variant="h5" sx={{
            fontWeight: 900
          }}>
            Заявки
          </Typography>
        </Stack>
        <Button variant="outlined" onClick={() => void load()} disabled={loading} sx={{ whiteSpace: "nowrap" }}>
          Обновить
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} useFlexGap sx={{
        flexWrap: "wrap"
      }}>
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
        <Stack spacing={2}>
          {filteredItems.length === 0 && !loading ? (
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Typography sx={{
                color: "text.secondary"
              }}>
                Нет заявок в этой категории.
              </Typography>
            </Paper>
          ) : null}
          {filteredItems.map((item) => {
            const title = item.message?.trim() || "Без описания";
            const subjectSubtitle = getSubjectSubtitle(item);
            const desktopMetaLeft = getDesktopMetaLeft(item);
            const statusLabel = getRequestStatusLabel(item.status);

            return (
              <Paper
                key={item.id}
                variant="outlined"
                role={item.status === "CLOSED" ? undefined : "link"}
                tabIndex={item.status === "CLOSED" ? undefined : 0}
                aria-disabled={item.status === "CLOSED" ? true : undefined}
                onClick={() => openRequest(item.id, item.status)}
                onKeyDown={(e) => {
                  if (item.status === "CLOSED") return;
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  openRequest(item.id, item.status);
                }}
                sx={{
                  p: 2.5,
                  cursor: item.status === "CLOSED" ? "default" : "pointer",
                  transition: (theme) => theme.transitions.create(["background-color", "box-shadow", "border-color"]),
                  ...(item.status === "CLOSED"
                    ? {}
                    : {
                        "&:hover": {
                          bgcolor: "action.hover",
                          boxShadow: 1,
                        },
                        "&:focus-visible": {
                          outline: "2px solid",
                          outlineColor: "primary.main",
                          outlineOffset: 2,
                        },
                      }),
                }}
              >
                <Stack spacing={1}>
                  <Box sx={{ display: { xs: "block", md: "none" } }}>
                    <Chip size="small" label={statusLabel} />
                  </Box>

                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}>
                    <Typography
                      noWrap
                      title={title}
                      sx={{
                        color: "text.primary",
                        fontWeight: 600,
                        minWidth: 0,
                        flex: 1
                      }}>
                      {title}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{
                        alignItems: "center",
                        flexShrink: 0
                      }}>
                      {item.canDeleteByCustomer ? (
                        <IconButton
                          size="small"
                          color="error"
                          aria-label="Удалить заявку"
                          disabled={deletingId === item.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            void deleteRequest(item);
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      ) : null}
                      <Chip
                        size="small"
                        label={statusLabel}
                        sx={{ display: { xs: "none", md: "inline-flex" } }}
                      />
                    </Stack>
                  </Stack>

                  {subjectSubtitle ? (
                    <Typography variant="body2" noWrap title={subjectSubtitle} sx={{
                      color: "text.secondary"
                    }}>
                      {subjectSubtitle}
                    </Typography>
                  ) : null}

                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{
                      alignItems: "center",
                      justifyContent: "space-between",
                      display: { xs: "none", md: "flex" }
                    }}>
                    <Typography
                      variant="body2"
                      noWrap
                      title={desktopMetaLeft || undefined}
                      sx={{
                        color: "text.secondary",
                        minWidth: 0,
                        flex: 1
                      }}>
                      {desktopMetaLeft}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        flexShrink: 0
                      }}>
                      {formatDate(item.createdAt)}
                    </Typography>
                  </Stack>

                  <Stack spacing={0.5} sx={{ display: { xs: "flex", md: "none" } }}>
                    {item.providerName ? (
                      <Typography variant="body2" sx={{
                        color: "text.secondary"
                      }}>
                        Исполнитель: {item.providerName}
                      </Typography>
                    ) : null}
                    {item.location ? (
                      <Typography variant="body2" sx={{
                        color: "text.secondary"
                      }}>
                        Локация: {item.location}
                      </Typography>
                    ) : null}
                    <Typography variant="caption" sx={{
                      color: "text.secondary"
                    }}>
                      {formatDate(item.createdAt)}
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
