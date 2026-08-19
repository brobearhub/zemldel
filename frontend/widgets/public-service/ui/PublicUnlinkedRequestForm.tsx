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
import { CadastralNumberListEditor } from "@/shared/ui/CadastralNumberListEditor";
import { useAppSelector } from "@/core/store/hooks";
import {
  REQUESTS_PROFILE_URL,
  REQUESTS_PROFILE_RESUME_URL,
  buildRequestAuthHref,
  savePendingRequestDraft,
  collectCadastralNumbersFromParts,
  createEmptyCadastralParts,
  type CadastralNumberParts,
} from "@/entities/request";
import { RequestFormLogo } from "@/widgets/public-service/ui/RequestFormLogo";

type Props = {
  isAuthenticated: boolean;
  categories?: Array<{ id: string; name: string }>;
  initialCategory?: { id: string; name: string } | null;
  variant?: "card" | "bare";
};

type FormState = {
  message: string;
  cadastralNumbers: CadastralNumberParts[];
  city: CitySuggestItemDto | null;
  category: { id: string; name: string } | null;
};

function normalizeNullableString(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function mapCustomerCityToSuggest(
  city: { id: string; name: string; regionCode: string; regionName: string } | null | undefined
): CitySuggestItemDto | null {
  if (!city) return null;
  const name = city.name.trim();
  const region = city.regionName.trim();
  const nameKey = name.toLowerCase();
  const regionKey = region.toLowerCase();
  return {
    id: city.id,
    name: city.name,
    regionCode: city.regionCode,
    regionName: city.regionName,
    displayName: regionKey.includes(nameKey) ? name : `${name}, ${region}`,
  };
}

export function PublicUnlinkedRequestForm({
  isAuthenticated,
  categories = [],
  initialCategory = null,
  variant = "card",
}: Props) {
  const router = useRouter();

  const { user } = useAppSelector((s) => s.auth);
  const customerCity = useMemo(() => mapCustomerCityToSuggest(user?.customerCity), [user?.customerCity]);
  const didInitCity = useRef(false);

  const [form, setForm] = useState<FormState>(() => ({
    message: "",
    cadastralNumbers: [createEmptyCadastralParts()],
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

  const { validationError, isBlocked } = useMemo(() => {
    if (!form.city) {
      return { validationError: "Укажите локацию.", isBlocked: true };
    }

    const msg = form.message.trim();
    if (!msg) {
      return { validationError: null, isBlocked: true };
    }

    const minLen = form.category ? 3 : 10;
    if (msg.length < minLen) {
      return {
        validationError:
          minLen === 3
            ? "Опишите задачу чуть подробнее (минимум 3 символа)."
            : "Опишите задачу чуть подробнее (минимум 10 символов).",
        isBlocked: true,
      };
    }

    const cadastral = collectCadastralNumbersFromParts(form.cadastralNumbers);
    if (cadastral.partialError) {
      return { validationError: cadastral.partialError, isBlocked: true };
    }

    return { validationError: null, isBlocked: false };
  }, [form.category, form.city, form.cadastralNumbers, form.message]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBlocked) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const requestCityId = form.city?.id ?? null;
      const cadastral = collectCadastralNumbersFromParts(form.cadastralNumbers);
      if (cadastral.partialError) {
        throw new Error(cadastral.partialError);
      }
      const message = normalizeNullableString(form.message.trim());
      const cadastralNumbers = cadastral.numbers;

      const category = form.category;
      if (category) {
        if (isAuthenticated) {
          const res = await fetch(`/api/service-categories/${category.id}/requests`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ message, requestCityId, cadastralNumbers }),
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
          categoryId: category.id,
          message,
          requestCityId,
          cadastralNumbers,
        });

        router.push(buildRequestAuthHref("signup", { kind: "CATEGORY", categoryId: category.id }));
        return;
      }

      if (isAuthenticated) {
        const res = await fetch("/api/requests", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message, requestCityId, cadastralNumbers }),
        });
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(payload?.error ?? "Не удалось создать заявку");
        }
        router.push(REQUESTS_PROFILE_URL);
        return;
      }

      savePendingRequestDraft({
        kind: "FREEFORM",
        message,
        requestCityId,
        cadastralNumbers,
      });

      router.push(buildRequestAuthHref("signup", { kind: "FREEFORM" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать заявку");
    } finally {
      setBusy(false);
    }
  }

  const content = (
    <Stack spacing={2.5}>
      <RequestFormLogo />

      <Stack spacing={2} component="form" onSubmit={handleSubmit}>
        {variant === "card" ? (
          <Stack spacing={0.5}>
            <Typography variant="h5" fontWeight={900} color="text.primary">
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
          label="Локация"
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

              <CadastralNumberListEditor
                value={form.cadastralNumbers}
                onChange={(cadastralNumbers) => setForm((prev) => ({ ...prev, cadastralNumbers }))}
                disabled={busy}
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Button
          color="info"
          type="submit"
          variant="contained"
          size="large"
          disabled={busy || isBlocked}
          startIcon={busy ? <CircularProgress size={18} color="inherit" /> : null}
          sx={{ fontWeight: 800, textTransform: "none" }}
        >
          {isAuthenticated ? "Создать заявку" : "Продолжить"}
        </Button>
      </Stack>
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
