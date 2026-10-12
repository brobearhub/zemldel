"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  CircularProgress,
  FormControlLabel,
  Radio,
  RadioGroup,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { CitySuggestItemDto } from "@/entities/city";
import { LocationField, useSelectedCity } from "@/features/select-city";
import { CadastralNumberChipsField } from "@/shared/ui/CadastralNumberChipsField";
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

type CategoryOption = { id: string; name: string };

type Props = {
  isAuthenticated: boolean;
  categories?: CategoryOption[];
  initialCategory?: CategoryOption | null;
  /** Категория раздела. Выбрана, пока не отмечена ни одна подкатегория. */
  sectionCategory?: CategoryOption | null;
  variant?: "card" | "bare";
};

type FormState = {
  message: string;
  cadastralNumbers: CadastralNumberParts[];
  category: CategoryOption | null;
};

function normalizeNullableString(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function PublicUnlinkedRequestForm({
  isAuthenticated,
  categories = [],
  initialCategory = null,
  sectionCategory = null,
  variant = "card",
}: Props) {
  const router = useRouter();
  const selectedCity = useSelectedCity("customer");
  const [cityOverride, setCityOverride] = useState<CitySuggestItemDto | null | undefined>(undefined);
  const city = cityOverride === undefined ? selectedCity : cityOverride;

  const [form, setForm] = useState<FormState>(() => ({
    message: "",
    cadastralNumbers: [createEmptyCadastralParts()],
    category: initialCategory,
  }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const subcategory = categories.find((option) => option.id === form.category?.id) ?? null;
  const category = subcategory ?? sectionCategory;

  const { validationError, isBlocked } = useMemo(() => {
    if (!city) {
      return { validationError: null, isBlocked: true };
    }

    const msg = form.message.trim();
    if (!msg) {
      return { validationError: null, isBlocked: true };
    }

    const minLen = category ? 3 : 10;
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
  }, [category, city, form.cadastralNumbers, form.message]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBlocked) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const requestCityId = city?.id ?? null;
      const cadastral = collectCadastralNumbersFromParts(form.cadastralNumbers);
      if (cadastral.partialError) {
        throw new Error(cadastral.partialError);
      }
      const message = normalizeNullableString(form.message.trim());
      const cadastralNumbers = cadastral.numbers;

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
    <Stack
      spacing={variant === "card" ? 4 : 2.5}
      sx={variant === "card" ? { flex: 1, justifyContent: "space-between" } : undefined}
    >
      <Stack spacing={variant === "card" ? 4 : 2} component="form" onSubmit={handleSubmit}>
        {variant === "card" ? (
          <Stack
            direction="row"
            spacing={2.5}
            sx={{ alignItems: "center", justifyContent: "center" }}
          >
            <RequestFormLogo compact />
            <Typography
              sx={{
                fontWeight: 500,
                fontSize: 20,
                lineHeight: 1.6,
                letterSpacing: "0.15px",
                textAlign: "center",
              }}
            >
              Нужна помощь?
            </Typography>
          </Stack>
        ) : (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {isAuthenticated
              ? "Специалисты свяжутся с вами в ближайшее время."
              : "Чтобы создать заявку, нужно зарегистрироваться или войти. После этого система продолжит оформление автоматически."}
          </Typography>
        )}

        {validationError && !error ? <Alert severity="warning">{validationError}</Alert> : null}
        {error ? <Alert severity="warning">{error}</Alert> : null}

        <Stack spacing={2}>
          <TextField
            label="Что нужно сделать?"
            value={form.message}
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            disabled={busy}
            fullWidth
            multiline
            minRows={3}
            required
          />

          <Stack spacing={2}>
            <LocationField
              label="Локация"
              value={city}
              onChange={(next) => {
                setCityOverride(next);
              }}
              disabled={busy}
              iconColor={city ? "primary" : "accent"}
            />

            <CadastralNumberChipsField
              value={form.cadastralNumbers}
              onChange={(cadastralNumbers) => setForm((prev) => ({ ...prev, cadastralNumbers }))}
              disabled={busy}
            />
          </Stack>
        </Stack>

        {variant !== "card" && (sectionCategory || categories.length > 0) ? (
          <Stack spacing={0.5}>
            {sectionCategory || categories.length === 1 ? (
              <Typography variant="body2" sx={{ color: "primary.main", fontWeight: 700, py: 0.5 }}>
                {sectionCategory?.name ?? categories[0]?.name}
              </Typography>
            ) : null}
            {categories.length > 1 ? (
              <RadioGroup
                value={subcategory?.id ?? ""}
                onChange={(_, id) => {
                  const next = categories.find((option) => option.id === id) ?? null;
                  setForm((prev) => ({ ...prev, category: next }));
                }}
              >
                {categories.map((option) => (
                  <FormControlLabel
                    key={option.id}
                    value={option.id}
                    control={
                      <Radio
                        size="small"
                        disabled={busy}
                        onClick={() => {
                          if (form.category?.id !== option.id) return;
                          setForm((prev) => ({ ...prev, category: null }));
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ pt: 0.25, color: "text.secondary" }}>
                        {option.name}
                      </Typography>
                    }
                    sx={{
                      alignItems: "flex-start",
                      mr: 0,
                      "& .MuiRadio-root": { py: 0.25, color: "divider" },
                      "& .MuiRadio-root.Mui-checked": { color: "primary.main" },
                    }}
                  />
                ))}
              </RadioGroup>
            ) : null}
          </Stack>
        ) : null}

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={busy || isBlocked}
          startIcon={busy ? <CircularProgress size={18} color="inherit" /> : null}
          sx={{
            fontWeight: 500,
            fontSize: 13,
            lineHeight: "22px",
            letterSpacing: "0.46px",
            textTransform: "none",
            py: 1,
            px: 2.75,
            boxShadow:
              variant === "card"
                ? "0px 1px 5px rgba(0,0,0,0.12), 0px 2px 2px rgba(0,0,0,0.14), 0px 3px 1px -2px rgba(0,0,0,0.2)"
                : undefined,
          }}
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
    <Paper
      elevation={0}
      sx={{
        p: 3,
        bgcolor: "background.paper",
        boxShadow: "none",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
      }}
    >
      {content}
    </Paper>
  );
}
