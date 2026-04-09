"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { SERVICE_REQUESTS_PROFILE_RESUME_URL, buildServiceRequestAuthHref, savePendingServiceRequestDraft } from "@/entities/service-request";

type Props = {
  serviceId: string;
  ctaText: string;
  ctaHref?: string | null;
  initialCustomerName?: string | null;
  initialCustomerEmail?: string | null;
  isAuthenticated: boolean;
};

type FormState = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  message: string;
};

function normalizeNullableString(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function PublicServiceRequestForm({
  serviceId,
  ctaText,
  ctaHref,
  initialCustomerName,
  initialCustomerEmail,
  isAuthenticated,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    customerName: initialCustomerName ?? "",
    customerEmail: initialCustomerEmail ?? "",
    customerPhone: "",
    message: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validationError = useMemo(() => {
    if (!form.customerEmail.trim() && !form.customerPhone.trim()) {
      return "Оставьте email или телефон, чтобы с вами можно было связаться.";
    }
    if (form.message.trim().length > 0 && form.message.trim().length < 3) {
      return "Сообщение должно быть чуть подробнее.";
    }
    return null;
  }, [form.customerEmail, form.customerPhone, form.message]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      savePendingServiceRequestDraft({
        kind: "SERVICE",
        serviceId,
        customerName: normalizeNullableString(form.customerName),
        customerEmail: normalizeNullableString(form.customerEmail),
        customerPhone: normalizeNullableString(form.customerPhone),
        message: normalizeNullableString(form.message),
      });

      if (!isAuthenticated) {
        router.push(buildServiceRequestAuthHref("signup", { kind: "SERVICE", serviceId }));
      } else {
        router.push(SERVICE_REQUESTS_PROFILE_RESUME_URL);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось отправить заявку");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2} component="form" onSubmit={handleSubmit}>
      <Typography variant="body2" color="text.secondary">
        {isAuthenticated
          ? "После подтверждения заявка будет зарегистрирована в системе и появится в вашем профиле."
          : "Чтобы отправить заявку, нужно зарегистрироваться или войти. После этого система продолжит оформление автоматически."}
      </Typography>

      {validationError && !error ? <Alert severity="info">{validationError}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <TextField
        label="Имя"
        value={form.customerName}
        onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))}
        disabled={busy}
        fullWidth
        size="small"
      />

      <TextField
        label="Email"
        type="email"
        value={form.customerEmail}
        onChange={(event) => setForm((current) => ({ ...current, customerEmail: event.target.value }))}
        disabled={busy}
        fullWidth
        size="small"
      />

      <TextField
        label="Телефон"
        value={form.customerPhone}
        onChange={(event) => setForm((current) => ({ ...current, customerPhone: event.target.value }))}
        disabled={busy}
        fullWidth
        size="small"
      />

      <TextField
        label="Сообщение"
        value={form.message}
        onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
        disabled={busy}
        fullWidth
        size="small"
        multiline
        minRows={3}
      />

      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={busy || Boolean(validationError)}
        sx={{ fontWeight: 700, textTransform: "none", px: 3, py: 1.25 }}
      >
        {ctaText}
      </Button>

      {ctaHref ? (
        <Button component={Link} href={ctaHref} variant="text" disabled={busy}>
          Открыть дополнительную ссылку
        </Button>
      ) : null}
    </Stack>
  );
}

