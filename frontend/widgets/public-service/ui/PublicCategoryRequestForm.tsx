"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import {
  SERVICE_REQUESTS_PROFILE_RESUME_URL,
  buildServiceRequestAuthHref,
  savePendingServiceRequestDraft,
} from "@/entities/service-request";

type Props = {
  categoryId: string;
  isAuthenticated: boolean;
};

type FormState = {
  message: string;
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

export function PublicCategoryRequestForm({ categoryId, isAuthenticated }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ message: "", cadastralBlock: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validationError = useMemo(() => {
    if (form.message.trim().length > 0 && form.message.trim().length < 3) {
      return "Сообщение должно быть чуть подробнее.";
    }
    return null;
  }, [form.message]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const cadastralNumber = buildCadastralNumber(form.cadastralBlock);
      const composedMessage = composeMessage(form.message, cadastralNumber);

      savePendingServiceRequestDraft({
        kind: "CATEGORY",
        categoryId,
        message: normalizeNullableString(composedMessage),
        requestCityId: null,
      });

      if (!isAuthenticated) {
        router.push(buildServiceRequestAuthHref("signup", { kind: "CATEGORY", categoryId }));
      } else {
        router.push(SERVICE_REQUESTS_PROFILE_RESUME_URL);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось создать заявку");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2} component="form" onSubmit={handleSubmit}>
      <Typography variant="body2" color="text.secondary">
        {isAuthenticated
          ? "После подтверждения заявка появится в вашем профиле и станет доступна компаниям в ленте."
          : "Чтобы создать заявку, нужно зарегистрироваться или войти. После этого система продолжит оформление автоматически."}
      </Typography>

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
        label="Кадастровый номер (опционально)"
        value={form.cadastralBlock}
        onChange={(event) => setForm((prev) => ({ ...prev, cadastralBlock: event.target.value }))}
        disabled={busy}
        fullWidth
        size="small"
        placeholder="укажите номер или улицу"
      />

      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={busy || Boolean(validationError)}
        sx={{ fontWeight: 800, textTransform: "none", px: 3, py: 1.25 }}
      >
        Получить предложения
      </Button>
    </Stack>
  );
}

