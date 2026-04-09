"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import { getServiceRequestStatusLabel, type ServiceRequestProDto } from "@/entities/service-request";

type Props = {
  initialRequest: ServiceRequestProDto;
};

function getNextActions(item: ServiceRequestProDto) {
  if (item.isLocked) return [];
  if (item.status === "NEW" || item.status === "DISCUSSING") {
    return [{ action: "take" as const, label: "Взять в работу" }];
  }
  if (item.status === "LOCKED") {
    return [{ action: "convert" as const, label: "Перевести в заказ" }];
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

  async function runAction(action: "take" | "convert") {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (action === "take") {
        const res = await fetch(`/api/pro/service-requests/${req.id}/take`, { method: "POST" });
        const payload = (await res.json().catch(() => null)) as { error?: string } | ServiceRequestProDto | null;
        if (!res.ok) {
          throw new Error(
            payload && typeof payload === "object" && "error" in payload
              ? payload.error ?? "Не удалось взять заявку в работу"
              : "Не удалось взять заявку в работу"
          );
        }
        setReq(payload as ServiceRequestProDto);
        setNotice("Заявка взята в работу.");
        return;
      }

      const res = await fetch(`/api/pro/service-requests/${req.id}/convert-to-order`, { method: "POST" });
      const payload = (await res.json().catch(() => null)) as
        | { error?: string }
        | { orderId: string; request: ServiceRequestProDto }
        | null;
      if (!res.ok) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? payload.error ?? "Не удалось перевести заявку в заказ"
            : "Не удалось перевести заявку в заказ"
        );
      }
      const data = payload as { orderId: string; request: ServiceRequestProDto };
      setOrderId(data.orderId);
      setReq(data.request);
      setNotice("Заявка переведена в заказ.");
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
              Заявка взята в работу другим провайдером.
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
              variant={a.action === "take" ? "contained" : "outlined"}
              color={a.action === "convert" ? "success" : "primary"}
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

