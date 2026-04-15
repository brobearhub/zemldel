"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import { getServiceRequestStatusLabel, type ServiceRequestProDto } from "@/entities/service-request";

type Props = {
  initialRequest: ServiceRequestProDto;
};

type NextAction = { action: "confirm" | "decline"; label: string };

function getNextActions(req: ServiceRequestProDto): NextAction[] {
  if (req.status === "CLOSED") return [];
  if (req.status === "ACTIVE" || req.status === "COMPLETED" || req.status === "CANCELLED") return [];
  if (req.isLocked) return [];

  if (req.offerStatus === "SELECTED") {
    return [
      { action: "confirm", label: "Начать работу с клиентом" },
      { action: "decline", label: "Отказать" },
    ];
  }
  return [];
}

export function ProRequestDetails({ initialRequest }: Props) {
  const [req, setReq] = useState(initialRequest);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const nextActions = useMemo(() => getNextActions(req), [req]);
  const pendingInfo =
    req.offerStatus === "SELECTED"
      ? "Клиент выбрал вас исполнителем. Можно начать работу."
      : req.offerStatus === "DECLINED"
        ? "Вы отказались от предложения."
        : null;

  async function runAction(action: "confirm" | "decline") {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
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

      const res = await fetch(`/api/pro/service-requests/${req.id}/confirm-order`, { method: "POST" });
      const payload = (await res.json().catch(() => null)) as
        | { error?: string }
        | { orderId: string; request: ServiceRequestProDto }
        | null;
      if (!res.ok) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? payload.error ?? "Не удалось начать работу"
            : "Не удалось начать работу"
        );
      }
      const data = payload as { orderId: string; request: ServiceRequestProDto };
      setOrderId(data.orderId);
      setReq(data.request);
      setNotice("Работа начата.");
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
    </Stack>
  );
}

