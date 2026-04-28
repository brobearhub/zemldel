"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Stack } from "@mui/material";

type Props = {
  paymentId: string;
  returnUrl: string;
};

type Outcome = "SUCCEEDED" | "CANCELLED";

export function MockPaymentActions({ paymentId, returnUrl }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(outcome: Outcome) {
    setBusy(outcome);
    setError(null);
    try {
      const res = await fetch(`/api/payments/mock/${paymentId}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Не удалось завершить оплату");
      }
      router.push(returnUrl);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось завершить оплату");
      setBusy(null);
    }
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <Button
          variant="contained"
          color="primary"
          disabled={busy !== null}
          onClick={() => submit("SUCCEEDED")}
          fullWidth
        >
          {busy === "SUCCEEDED" ? "Подтверждение..." : "Оплатить"}
        </Button>
        <Button
          variant="outlined"
          color="inherit"
          disabled={busy !== null}
          onClick={() => submit("CANCELLED")}
          fullWidth
        >
          {busy === "CANCELLED" ? "Отмена..." : "Отменить"}
        </Button>
      </Stack>
    </Stack>
  );
}
