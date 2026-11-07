"use client";
import { useEffect, useState } from "react";
import { Alert, Link } from "@mui/material";
import { useAppSelector } from "@/core/store/hooks";
import { getActiveMembership } from "@/core/auth/authorization";
import type { BillingOverview } from "./model";

export function PlanStatusBanner() {
  const user = useAppSelector((state) => state.auth.user);
  const providerId = getActiveMembership(user)?.providerId;
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  useEffect(() => {
    if (!providerId) return;
    let canceled = false;
    const refresh = () => {
      if (document.hidden) return;
      void fetch(`/api/billing/providers/${providerId}`, { cache: "no-store" })
        .then(async (response) => {
          if (response.ok && !canceled)
            setBilling((await response.json()) as BillingOverview);
        })
        .catch(() => undefined);
    };
    refresh();
    const timer = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => {
      canceled = true;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [providerId]);
  if (
    !billing?.enforcementEnabled ||
    !billing.graceUntil ||
    new Date(billing.graceUntil) <= new Date()
  )
    return null;
  return (
    <Alert
      severity="warning"
      sx={{ mb: 2 }}
    >
      Не удалось продлить тариф. Возможности доступны до{" "}
      {new Date(billing.graceUntil).toLocaleString("ru-RU")}.{" "}
      <Link href="/pro/billing">Проверить оплату</Link>
    </Alert>
  );
}
