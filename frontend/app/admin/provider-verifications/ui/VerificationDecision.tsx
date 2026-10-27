"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { REJECT_REASON_TEMPLATES } from "../model";

type Props = {
  requestId: string;
};

export function VerificationDecision({ requestId }: Props) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);

  async function approve() {
    setBusy(true);
    setPendingAction("approve");
    setError(null);
    try {
      const response = await fetch(`/api/admin/provider-verifications/${requestId}/approve`, {
        method: "POST",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
        setError(payload?.message ?? payload?.error ?? "Не удалось подтвердить");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function reject() {
    const text = reason.trim();
    if (!text) {
      setError("Укажите причину отклонения");
      return;
    }
    setBusy(true);
    setPendingAction("reject");
    setError(null);
    try {
      const response = await fetch(`/api/admin/provider-verifications/${requestId}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: text }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string | string[]; error?: string } | null;
        const message = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;
        setError(message ?? payload?.error ?? "Не удалось отклонить");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  return (
    <Stack spacing={1.5}>
      <Typography sx={{ fontWeight: 800 }}>Решение</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Button variant="contained" loading={pendingAction === "approve"} disabled={busy} onClick={() => void approve()} sx={{ alignSelf: "flex-start", minHeight: 44 }}>
        Подтвердить
      </Button>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        Причина уйдёт исполнителю дословно.
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        {REJECT_REASON_TEMPLATES.map((template) => (
          <Button key={template} size="small" variant="outlined" onClick={() => setReason(template)} sx={{ minHeight: 44 }}>
            {template}
          </Button>
        ))}
      </Stack>
      <TextField
        label="Причина отклонения"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        multiline
        minRows={2}
        fullWidth
      />
      <Button
        variant="outlined"
        color="error"
        loading={pendingAction === "reject"}
        disabled={busy || reason.trim().length === 0}
        onClick={() => void reject()}
        sx={{ alignSelf: "flex-start", minHeight: 44 }}
      >
        Отклонить
      </Button>
    </Stack>
  );
}
