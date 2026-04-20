"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { CitySuggestItemDto } from "@/entities/city";
import { CityAutocomplete } from "@/shared/ui/CityAutocomplete";
import { useAppSelector } from "@/core/store/hooks";
import {
  SERVICE_REQUESTS_PROFILE_URL,
  SERVICE_REQUESTS_PROFILE_RESUME_URL,
  buildServiceRequestAuthHref,
  savePendingServiceRequestDraft,
} from "@/entities/service-request";

type Props = {
  isAuthenticated: boolean;
  categories?: Array<{ id: string; name: string }>;
  initialCategory?: { id: string; name: string } | null;
  variant?: "card" | "bare";
};

type FormState = {
  message: string;
  cadastralBlock: string;
  city: CitySuggestItemDto | null;
  category: { id: string; name: string } | null;
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

function composeMessage(message: string, extras: { cadastralNumber?: string | null }) {
  const msg = message.trim();
  const parts: string[] = [];
  if (msg) parts.push(msg);
  if (extras.cadastralNumber) parts.push(`Кадастровый номер: ${extras.cadastralNumber}`);
  return parts.join("\n\n");
}

function mapCustomerCityToSuggest(
  city: { id: string; name: string; regionCode: string; regionName: string } | null | undefined
): CitySuggestItemDto | null {
  if (!city) return null;
  return {
    id: city.id,
    name: city.name,
    regionCode: city.regionCode,
    regionName: city.regionName,
    displayName: `г ${city.name}, ${city.regionName}`,
  };
}

export function PublicUnlinkedRequestForm({
  isAuthenticated,
  categories = [],
  initialCategory = null,
  variant = "card",
}: Props) {
  const router = useRouter();

  const { status, user } = useAppSelector((s) => s.auth);
  const customerCity = useMemo(() => mapCustomerCityToSuggest(user?.customerCity), [user?.customerCity]);
  const didInitCity = useRef(false);

  const [form, setForm] = useState<FormState>(() => ({
    message: "",
    cadastralBlock: "",
    city: null,
    category: initialCategory,
  }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [optionalExpanded, setOptionalExpanded] = useState(false);

  useEffect(() => {
    if (didInitCity.current) return;
    if (!customerCity) return;
    setForm((prev) => (prev.city ? prev : { ...prev, city: customerCity }));
    didInitCity.current = true;
  }, [customerCity]);

  const validationError = useMemo(() => {
    if (!form.city) {
      return "Укажите город.";
    }
    const msg = form.message.trim();
    if (!msg) {
      return "Сообщение обязательно.";
    }
    const minLen = form.category ? 3 : 10;
    if (msg.length < minLen) {
      return minLen === 3
        ? "Опишите задачу чуть подробнее (минимум 3 символа)."
        : "Опишите задачу чуть подробнее (минимум 10 символов).";
    }
    return null;
  }, [form.category, form.city, form.message]);

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
      const requestCityId = form.city?.id ?? null;

      const category = form.category;
      if (category) {
        const composedMessage = composeMessage(form.message, { cadastralNumber });

        if (isAuthenticated) {
          const res = await fetch(`/api/service-categories/${category.id}/requests`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ message: normalizeNullableString(composedMessage), requestCityId }),
          });
          const payload = (await res.json().catch(() => null)) as { error?: string } | null;
          if (!res.ok) {
            throw new Error(payload?.error ?? "Не удалось создать заявку");
          }
          router.push(SERVICE_REQUESTS_PROFILE_URL);
          return;
        }

        savePendingServiceRequestDraft({
          kind: "CATEGORY",
          categoryId: category.id,
          message: normalizeNullableString(composedMessage),
          requestCityId,
        });

        if (!isAuthenticated) {
          router.push(buildServiceRequestAuthHref("signup", { kind: "CATEGORY", categoryId: category.id }));
        } else {
          router.push(SERVICE_REQUESTS_PROFILE_RESUME_URL);
        }
        return;
      }

      const composedMessage = composeMessage(form.message, { cadastralNumber });

      if (isAuthenticated) {
        const res = await fetch("/api/service-requests", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: normalizeNullableString(composedMessage), requestCityId }),
        });
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(payload?.error ?? "Не удалось создать заявку");
        }
        router.push(SERVICE_REQUESTS_PROFILE_URL);
        return;
      }

      savePendingServiceRequestDraft({
        kind: "FREEFORM",
        message: normalizeNullableString(composedMessage),
        requestCityId,
      });

      if (!isAuthenticated) {
        router.push(buildServiceRequestAuthHref("signup", { kind: "FREEFORM" }));
      } else {
        router.push(SERVICE_REQUESTS_PROFILE_RESUME_URL);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать заявку");
    } finally {
      setBusy(false);
    }
  }

  const content = (
    <Stack spacing={2} component="form" onSubmit={handleSubmit}>
      {variant === "card" ? (
        <Stack spacing={0.5}>
          <Typography variant="h5" fontWeight={900}>
            Нужна помощь? Создайте заявку
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isAuthenticated
              ? "Специалисты свяжутся с вами в ближайшее время."
              : "Чтобы создать заявку, нужно зарегистрироваться или войти. После этого система продолжит оформление автоматически."}
          </Typography>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {isAuthenticated
            ? "Специалисты свяжутся с вами в ближайшее время."
            : "Чтобы создать заявку, нужно зарегистрироваться или войти. После этого система продолжит оформление автоматически."}
        </Typography>
      )}

      {validationError && !error ? <Alert severity="info">{validationError}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <CityAutocomplete
        label="Город"
        value={form.city}
        onChange={(next) => setForm((prev) => ({ ...prev, city: next }))}
        disabled={busy}
        placeholder="Начните вводить (минимум 2 символа)"
      />

      <TextField
        label="Что нужно сделать?"
        value={form.message}
        onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
        disabled={busy}
        fullWidth
        size="small"
        multiline
        minRows={3}
        required
      />

      <Accordion
        expanded={optionalExpanded}
        onChange={(_, next) => setOptionalExpanded(next)}
        disableGutters
        elevation={0}
        sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, "&:before": { display: "none" } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={800}>Опционально</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Autocomplete
              options={categories}
              value={form.category}
              onChange={(_, next) => setForm((prev) => ({ ...prev, category: next }))}
              getOptionLabel={(o) => o.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Категория (опционально)"
                  size="small"
                  placeholder="Можно оставить пустым"
                />
              )}
              disabled={busy}
              clearOnEscape
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
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={busy || Boolean(validationError)}
        startIcon={busy ? <CircularProgress size={18} color="inherit" /> : null}
        sx={{ fontWeight: 800, textTransform: "none" }}
      >
        {isAuthenticated ? "Создать заявку" : "Продолжить"}
      </Button>
    </Stack>
  );

  if (variant === "bare") {
    return content;
  }

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      {content}
    </Paper>
  );
}

