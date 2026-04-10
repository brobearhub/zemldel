"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import { useSession } from "next-auth/react";
import { getServiceRequestStatusLabel, type ServiceRequestProDto } from "@/entities/service-request";

type Props = {
  initialRequest: ServiceRequestProDto;
};

type NextAction = { action: "initiate" | "confirm"; label: string };

function getNextActions(input: {
  req: ServiceRequestProDto;
  activeProviderId: string | null;
}): NextAction[] {
  const { req, activeProviderId } = input;
  if (req.status === "CLOSED") return [];
  if (req.status === "ACTIVE" || req.status === "COMPLETED" || req.status === "CANCELLED") return [];
  if (req.isLocked) return [];

  const isPendingForMe = Boolean(activeProviderId) && req.pendingProviderId === activeProviderId;
  if (req.pendingProviderId && !isPendingForMe) return [];

  if (req.pendingInitiator === "CUSTOMER" && isPendingForMe) {
    return [{ action: "confirm", label: "Начать работу" }];
  }
  if (!req.pendingProviderId && !req.pendingInitiator) {
    return [{ action: "initiate", label: "Взять заказ" }];
  }
  return [];
}

export function ProRequestDetails({ initialRequest }: Props) {
  const { data: session } = useSession();
  const activeProviderId = session?.user?.activeProviderId ?? null;

  const [req, setReq] = useState(initialRequest);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const nextActions = useMemo(() => getNextActions({ req, activeProviderId }), [req, activeProviderId]);
  const isPendingForMe = Boolean(activeProviderId) && req.pendingProviderId === activeProviderId;
  const pendingInfo =
    req.pendingProviderId && req.pendingAt
      ? req.pendingInitiator === "PROVIDER"
        ? "Вы предложили заказ. Ожидаем подтверждения клиента."
        : req.pendingInitiator === "CUSTOMER"
          ? "Клиент запросил заказ. Можно подтвердить."
          : null
      : null;

  async function runAction(action: "initiate" | "confirm") {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (action === "initiate") {
        const res = await fetch(`/api/pro/service-requests/${req.id}/initiate-order`, { method: "POST" });
        const payload = (await res.json().catch(() => null)) as { error?: string } | ServiceRequestProDto | null;
        if (!res.ok) {
          throw new Error(
            payload && typeof payload === "object" && "error" in payload
              ? payload.error ?? "Не удалось взять заказ"
              : "Не удалось взять заказ"
          );
        }
        setReq(payload as ServiceRequestProDto);
        setNotice("Запрос на заказ отправлен клиенту.");
        return;
      }

      const res = await fetch(`/api/pro/service-requests/${req.id}/confirm-order`, { method: "POST" });
      const payload = (await res.json().catch(() => null)) as
        | { error?: string }
        | { orderId: string; request: ServiceRequestProDto }
        | null;
      if (!res.ok) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? payload.error ?? "Не удалось подтвердить заказ"
            : "Не удалось подтвердить заказ"
        );
      }
      const data = payload as { orderId: string; request: ServiceRequestProDto };
      setOrderId(data.orderId);
      setReq(data.request);
      setNotice("Заказ подтверждён.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось выполнить действие");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2}>
      {notice ? <Alert severity="success">{notice}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={1}>
          <Typography variant="h6" fontWeight={800}>
            Детали
          </Typography>
          <Typography color="text.secondary">Статус: {getServiceRequestStatusLabel(req.status)}</Typography>
          <Typography color="text.secondary">Диалогов: {req.conversationsCount}</Typography>
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
          {req.location ? (
            <Typography variant="body2" color="text.secondary">
              Локация: {req.location}
            </Typography>
          ) : null}
          {req.message ? <Typography color="text.secondary">{req.message}</Typography> : null}
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
              variant={a.action === "initiate" ? "contained" : "contained"}
              color={a.action === "confirm" ? "success" : "primary"}
              disabled={busy}
              onClick={() => void runAction(a.action)}
            >
              {a.label}
            </Button>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}

