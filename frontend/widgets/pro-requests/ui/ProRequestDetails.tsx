"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { StatusProgressStepper } from "@/entities/order/ui/order-ui";
import {
  buildServiceRequestFlowSteps,
  getServiceRequestFlowActiveStepId,
  getServiceRequestStatusLabel,
  isServiceRequestOrderStatus,
  type ServiceRequestProDto,
} from "@/entities/service-request";

type Props = {
  initialRequest: ServiceRequestProDto;
  subtitle: string;
};

type NextAction = { action: "confirm" | "decline"; label: string };

function getNextActions(req: ServiceRequestProDto): NextAction[] {
  if (req.status === "CLOSED") return [];
  if (req.isLocked) return [];

  if (req.status === "PAYMENT_PROCESSING") return [{ action: "confirm", label: "Начать работу" }];
  if (req.status === "ACTIVE") return [{ action: "confirm", label: "Услуга выполнена" }];
  if (req.status === "SERVICE_RENDERED") return [{ action: "confirm", label: "Передать на принятие" }];
  if (req.status === "ACCEPTED") return [{ action: "confirm", label: "Выплатить исполнителю" }];
  if (req.status === "PAID") return [{ action: "confirm", label: "Завершить" }];

  // Pre-order stage: provider can propose terms (and optionally decline selection).
  if (!isServiceRequestOrderStatus(req.status) && req.offerStatus === "SELECTED") {
    return [{ action: "decline", label: "Отказать" }];
  }

  return [];
}

export function ProRequestDetails({ initialRequest, subtitle }: Props) {
  const [req, setReq] = useState(initialRequest);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsPrice, setTermsPrice] = useState("");
  const [termsTimeline, setTermsTimeline] = useState("");
  const [termsScope, setTermsScope] = useState("");
  const [termsPaymentType, setTermsPaymentType] = useState<"ADVANCE" | "FULL">("FULL");

  const nextActions = useMemo(() => getNextActions(req), [req]);
  const pendingInfo =
    req.offerStatus === "SELECTED"
      ? "Клиент выбрал вас исполнителем. Можно согласовать условия и заключить договор."
      : req.offerStatus === "DECLINED"
        ? "Вы отказались от предложения."
        : null;

  async function refresh() {
    const res = await fetch(`/api/pro/service-requests/${req.id}`, { cache: "no-store" });
    const payload = (await res.json().catch(() => null)) as { error?: string } | ServiceRequestProDto | null;
    if (!res.ok) {
      throw new Error(payload && typeof payload === "object" && "error" in payload ? payload.error ?? "Не удалось обновить заявку" : "Не удалось обновить заявку");
    }
    setReq(payload as ServiceRequestProDto);
  }

  async function setTerms() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const dealTerms = {
        price: termsPrice.trim(),
        timeline: termsTimeline.trim(),
        scope: termsScope.trim(),
        payment: { type: termsPaymentType },
      };
      const res = await fetch(`/api/pro/service-requests/${req.id}/set-terms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealTerms }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | ServiceRequestProDto | null;
      if (!res.ok) {
        throw new Error(payload && typeof payload === "object" && "error" in payload ? payload.error ?? "Не удалось отправить условия" : "Не удалось отправить условия");
      }
      setReq(payload as ServiceRequestProDto);
      setNotice("Условия отправлены клиенту.");
      setTermsOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить условия");
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action: "confirm" | "decline") {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (action === "confirm") {
        if (req.status === "PAYMENT_PROCESSING") {
          const res = await fetch(`/api/pro/orders/${req.id}/start-work`, { method: "POST" });
          const payload = (await res.json().catch(() => null)) as { error?: string } | unknown | null;
          if (!res.ok) {
            throw new Error(payload && typeof payload === "object" && payload && "error" in (payload as any) ? ((payload as any).error as string) : "Не удалось начать работу");
          }
          await refresh();
          setNotice("Работа начата.");
          return;
        }
        if (req.status === "ACTIVE") {
          const res = await fetch(`/api/pro/orders/${req.id}/mark-rendered`, { method: "POST" });
          const payload = (await res.json().catch(() => null)) as { error?: string } | unknown | null;
          if (!res.ok) {
            throw new Error(payload && typeof payload === "object" && payload && "error" in (payload as any) ? ((payload as any).error as string) : "Не удалось отметить выполнение");
          }
          await refresh();
          setNotice("Услуга отмечена как оказанная.");
          return;
        }
        if (req.status === "SERVICE_RENDERED") {
          const res = await fetch(`/api/pro/orders/${req.id}/request-acceptance`, { method: "POST" });
          const payload = (await res.json().catch(() => null)) as { error?: string } | unknown | null;
          if (!res.ok) {
            throw new Error(payload && typeof payload === "object" && payload && "error" in (payload as any) ? ((payload as any).error as string) : "Не удалось запросить принятие");
          }
          await refresh();
          setNotice("Передано на принятие клиенту.");
          return;
        }
        if (req.status === "ACCEPTED") {
          const res = await fetch(`/api/pro/orders/${req.id}/payout`, { method: "POST" });
          const payload = (await res.json().catch(() => null)) as { error?: string } | unknown | null;
          if (!res.ok) {
            throw new Error(payload && typeof payload === "object" && payload && "error" in (payload as any) ? ((payload as any).error as string) : "Не удалось выполнить выплату");
          }
          await refresh();
          setNotice("Выплата произведена.");
          return;
        }
        if (req.status === "PAID") {
          const res = await fetch(`/api/pro/orders/${req.id}/complete`, { method: "POST" });
          const payload = (await res.json().catch(() => null)) as { error?: string } | unknown | null;
          if (!res.ok) {
            throw new Error(payload && typeof payload === "object" && payload && "error" in (payload as any) ? ((payload as any).error as string) : "Не удалось завершить");
          }
          await refresh();
          setNotice("Сделка завершена.");
          return;
        }
      }

      if (action === "decline") {
        const res = await fetch(`/api/pro/service-requests/${req.id}/decline-offer`, { method: "POST" });
        const payload = (await res.json().catch(() => null)) as { error?: string } | ServiceRequestProDto | null;
        if (!res.ok) {
          throw new Error(
            payload && typeof payload === "object" && "error" in payload
              ? payload.error ?? "Не удалось отказать"
              : "Не удалось отказать"
          );
        }
        setReq(payload as ServiceRequestProDto);
        setNotice("Вы отказались от предложения.");
        return;
      }

      throw new Error("Unsupported action");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось выполнить действие");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
          <Typography variant="h4" fontWeight={700}>
            Заявка
          </Typography>
          <Chip size="small" label={getServiceRequestStatusLabel(req.status)} />
        </Stack>
        <Typography color="text.secondary">{subtitle}</Typography>
        {req.message ? <Typography sx={{ whiteSpace: "pre-wrap" }}>{req.message}</Typography> : null}
      </Stack>

      {notice ? <Alert severity="success">{notice}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={1}>
          <Typography variant="h6" fontWeight={800}>
            Детали
          </Typography>

          <StatusProgressStepper
            steps={buildServiceRequestFlowSteps(req.status, {
              status: req.offerStatus,
            })}
            activeStepId={getServiceRequestFlowActiveStepId(req.status, {
              status: req.offerStatus,
            })}
          />
          {req.isLocked ? (
            <Typography variant="body2" color="text.secondary">
              Заказ уже оформлен другим провайдером.
            </Typography>
          ) : null}
          {!req.isLocked && pendingInfo ? (
            <Typography variant="body2" color="text.secondary">
              {pendingInfo}
            </Typography>
          ) : null}
          {!req.isLocked && !isServiceRequestOrderStatus(req.status) && req.offerStatus === "SELECTED" ? (
            <Button
              variant="contained"
              disabled={busy}
              onClick={() => {
                setTermsOpen(true);
              }}
              sx={{ alignSelf: "flex-start" }}
            >
              Предложить условия
            </Button>
          ) : null}
          {req.location ? (
            <Typography variant="body2" color="text.secondary">
              Локация: {req.location}
            </Typography>
          ) : null}
          <Typography variant="body2" color="text.secondary">
            Диалогов: {req.conversationsCount}
          </Typography>
        </Stack>
      </Paper>

      {orderId ? (
        <Button component={Link} href={`/pro/orders/${orderId}`} variant="contained" color="success">
          Открыть заказ
        </Button>
      ) : null}

      {nextActions.length > 0 ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {nextActions.map((a) => (
            <Button
              key={a.action}
              variant="contained"
              color={a.action === "confirm" ? "success" : "secondary"}
              disabled={busy}
              onClick={() => void runAction(a.action)}
            >
              {a.label}
            </Button>
          ))}
        </Stack>
      ) : null}

      <Dialog open={termsOpen} onClose={() => (busy ? null : setTermsOpen(false))} fullWidth maxWidth="sm">
        <DialogTitle>Условия сделки</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Цена" value={termsPrice} onChange={(e) => setTermsPrice(e.target.value)} />
            <TextField label="Сроки" value={termsTimeline} onChange={(e) => setTermsTimeline(e.target.value)} />
            <TextField label="Объем" value={termsScope} onChange={(e) => setTermsScope(e.target.value)} multiline minRows={2} />
            <TextField
              label="Оплата (ADVANCE или FULL)"
              value={termsPaymentType}
              onChange={(e) => setTermsPaymentType(e.target.value === "ADVANCE" ? "ADVANCE" : "FULL")}
              helperText="В MVP: укажи ADVANCE (аванс) или FULL (100%)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setTermsOpen(false)}>
            Отмена
          </Button>
          <Button variant="contained" disabled={busy || !termsPrice.trim() || !termsTimeline.trim() || !termsScope.trim()} onClick={() => void setTerms()}>
            Отправить условия
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

