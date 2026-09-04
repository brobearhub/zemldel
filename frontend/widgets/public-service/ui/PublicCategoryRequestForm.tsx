"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import { CadastralNumberListEditor } from "@/shared/ui/CadastralNumberListEditor";
import {
  REQUESTS_PROFILE_URL,
  REQUESTS_PROFILE_RESUME_URL,
  buildRequestAuthHref,
  savePendingRequestDraft,
  collectCadastralNumbersFromParts,
  createEmptyCadastralParts,
} from "@/entities/request";
import { RequestFormLogo } from "@/widgets/public-service/ui/RequestFormLogo";

type Props = {
  categoryId: string;
  isAuthenticated: boolean;
};

function normalizeNullableString(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function PublicCategoryRequestForm({ categoryId, isAuthenticated }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [cadastralNumbers, setCadastralNumbers] = useState([createEmptyCadastralParts()]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validationError = useMemo(() => {
    if (message.trim().length > 0 && message.trim().length < 3) {
      return "Сообщение должно быть чуть подробнее.";
    }
    const cadastral = collectCadastralNumbersFromParts(cadastralNumbers);
    if (cadastral.partialError) return cadastral.partialError;
    return null;
  }, [cadastralNumbers, message]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const cadastral = collectCadastralNumbersFromParts(cadastralNumbers);
      if (cadastral.partialError) {
        throw new Error(cadastral.partialError);
      }

      if (isAuthenticated) {
        const res = await fetch(`/api/service-categories/${categoryId}/requests`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            message: normalizeNullableString(message),
            requestCityId: null,
            cadastralNumbers: cadastral.numbers,
          }),
        });
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(payload?.error ?? "Не удалось создать заявку");
        }
        router.push(REQUESTS_PROFILE_URL);
        return;
      }

      savePendingRequestDraft({
        kind: "CATEGORY",
        categoryId,
        message: normalizeNullableString(message),
        requestCityId: null,
        cadastralNumbers: cadastral.numbers,
      });

      if (!isAuthenticated) {
        router.push(buildRequestAuthHref("signup", { kind: "CATEGORY", categoryId }));
      } else {
        router.push(REQUESTS_PROFILE_RESUME_URL);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось создать заявку");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2.5}>
      <RequestFormLogo />

      <Stack spacing={2} component="form" onSubmit={handleSubmit}>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {isAuthenticated
            ? "После подтверждения заявка появится в вашем профиле и станет доступна компаниям в ленте."
            : "Чтобы создать заявку, нужно зарегистрироваться или войти. После этого система продолжит оформление автоматически."}
        </Typography>

        {validationError && !error ? <Alert severity="info">{validationError}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}

        <TextField
          label="Что нужно сделать?"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={busy}
          fullWidth
          size="small"
          multiline
          minRows={3}
        />

        <CadastralNumberListEditor
          value={cadastralNumbers}
          onChange={setCadastralNumbers}
          disabled={busy}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={busy || Boolean(validationError)}
          startIcon={busy ? <CircularProgress size={18} color="inherit" /> : null}
          sx={{ fontWeight: 800, textTransform: "none", px: 3, py: 1.25 }}
        >
          Получить предложения
        </Button>
      </Stack>
    </Stack>
  );
}
