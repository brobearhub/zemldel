"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Paper, Stack, TextField, Typography } from "@mui/material";

type Props = {
  isAuthenticated: boolean;
};

type FormState = {
  message: string;
  location: string;
  cadastralBlock: string;
};

function normalizeNullableString(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCadastralPart(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "")
    .replace(/:+/g, ":")
    .replace(/^:+|:+$/g, "");
}

function buildCadastralNumber(raw: string): string | null {
  const normalized = normalizeCadastralPart(raw);
  return normalized.length > 0 ? normalized : null;
}

function composeMessage(message: string, cadastralNumber: string | null) {
  const msg = message.trim();
  const parts: string[] = [];
  if (msg) parts.push(msg);
  if (cadastralNumber) parts.push(`Кадастровый номер: ${cadastralNumber}`);
  return parts.join("\n\n");
}

export function PublicUnlinkedRequestForm({ isAuthenticated }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ message: "", location: "", cadastralBlock: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validationError = useMemo(() => {
    if (form.message.trim().length > 0 && form.message.trim().length < 10) {
      return "Опишите задачу чуть подробнее (минимум 10 символов).";
    }
    if (form.location.trim().length > 0 && form.location.trim().length < 2) {
      return "Укажите локацию (минимум 2 символа).";
    }
    return null;
  }, [form.location, form.message]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAuthenticated) {
      return;
    }
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const cadastralNumber = buildCadastralNumber(form.cadastralBlock);
      const composedMessage = composeMessage(form.message, cadastralNumber);

      const response = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: normalizeNullableString(composedMessage),
          location: normalizeNullableString(form.location),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Не удалось создать заявку");
      }
      router.push("/profile");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать заявку");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={2} component="form" onSubmit={handleSubmit}>
        <Stack spacing={0.5}>
          <Typography variant="h5" fontWeight={900}>
            Нужна помощь? Создайте заявку
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Заявка появится в ленте у провайдеров. Вы сможете обсудить детали в чате и выбрать исполнителя.
          </Typography>
        </Stack>

        {validationError && !error ? <Alert severity="info">{validationError}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}

        <TextField
          label="Что нужно сделать?"
          value={form.message}
          onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
          disabled={busy}
          fullWidth
          size="small"
          multiline
          minRows={3}
        />

        <TextField
          label="Где вы находитесь?"
          value={form.location}
          onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
          disabled={busy}
          fullWidth
          size="small"
          placeholder="Город / район"
        />

        <TextField
          label="Кадастровый номер (опционально)"
          value={form.cadastralBlock}
          onChange={(event) => setForm((prev) => ({ ...prev, cadastralBlock: event.target.value }))}
          disabled={busy}
          fullWidth
          size="small"
          placeholder="xx:xx:xxxxxxx:xx"
        />

        {isAuthenticated ? (
          <Button type="submit" variant="contained" size="large" disabled={busy || Boolean(validationError)} sx={{ fontWeight: 800, textTransform: "none" }}>
            Создать заявку
          </Button>
        ) : (
          <Button component={Link} href="/signin" variant="contained" size="large" sx={{ fontWeight: 800, textTransform: "none" }}>
            Войти, чтобы создать заявку
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

