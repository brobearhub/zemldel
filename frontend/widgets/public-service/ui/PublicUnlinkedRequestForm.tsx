"use client";

import { fetchIdempotentWrite } from "@/shared/api/idempotent-write";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRequestFormDraft } from "../model/use-request-form-draft";
import {
  Alert,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { LocationField, useSelectedCity } from "@/features/select-city";
import { CadastralNumberChipsField } from "@/shared/ui/CadastralNumberChipsField";
import {
  buildRequestAuthHref,
  readPendingRequestDraft,
  savePendingRequestDraft,
  cadastralPartsFromInput,
  collectCadastralNumbersFromParts,
  createEmptyCadastralParts,
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
  const { data: session } = useSession();
  const actor = isAuthenticated ? session?.user?.id ?? null : "guest";
  const { form, setForm, cityOverride, setCityOverride, clearDraft } = useRequestFormDraft(actor, sectionCategory?.id ?? initialCategory?.id ?? "FREEFORM", initialCategory);
  const city = cityOverride === undefined ? selectedCity : cityOverride;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const restored = useRef(false);

  useEffect(() => {
    if (!actor || restored.current) return;
    restored.current = true;
    if (isAuthenticated && new URLSearchParams(window.location.search).get("requestDraft") !== "1") return;
    const saved = readPendingRequestDraft();
    if (!saved || saved.kind === "SERVICE" || saved.createdRequestId) return;
    const savedCategory = saved.kind === "CATEGORY"
      ? categories.find((item) => item.id === saved.categoryId) ??
        (sectionCategory?.id === saved.categoryId ? sectionCategory : null)
      : null;
    if (saved.kind === "CATEGORY" && !savedCategory) return;
    setForm({
      message: saved.message ?? "",
      cadastralNumbers: saved.cadastralNumbers.length ? saved.cadastralNumbers.map(cadastralPartsFromInput) : [createEmptyCadastralParts()],
      category: savedCategory,
    });
    if (saved.requestCity) setCityOverride(saved.requestCity);
  }, [actor, categories, isAuthenticated, sectionCategory, setForm, setCityOverride]);

  const subcategory = categories.find((option) => option.id === form.category?.id) ?? null;
  const category = subcategory ?? sectionCategory;

  const { validationError, isBlocked } = useMemo(() => {
    if (!city) {
      return { validationError: "Выберите населённый пункт, где нужны работы.", isBlocked: true };
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

      const draft = {
        ...(category ? { kind: "CATEGORY" as const, categoryId: category.id } : { kind: "FREEFORM" as const }),
        message,
        requestCityId,
        requestCity: city,
        subjectTitle: category?.name ?? null,
        cadastralNumbers,
      };

      if (isAuthenticated) {
        const res = await fetchIdempotentWrite(category ? `/api/service-categories/${category.id}/requests` : "/api/requests", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message, requestCityId, cadastralNumbers }),
        });
        if (res.status === 401) {
          savePendingRequestDraft(draft);
          router.push(buildRequestAuthHref("signin", draft, true));
          return;
        }
        const payload = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
        if (!res.ok || !payload?.id) {
          throw new Error(payload?.error ?? "Не удалось создать заявку");
        }
        clearDraft();
        router.push(`/profile/requests/${payload.id}?created=1`);
        return;
      }

      savePendingRequestDraft(draft);
      clearDraft();
      router.push(buildRequestAuthHref("signup", draft));
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
          <Stack spacing={1.5}>
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
            <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center" }}>
              Заявку увидят несколько подходящих исполнителей. Сравните ответы в чатах и выберите одного.
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={1}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {isAuthenticated
                ? "Специалисты свяжутся с вами в ближайшее время."
                : "Чтобы создать заявку, нужно зарегистрироваться или войти. После этого система продолжит оформление автоматически."}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Заявку увидят несколько подходящих исполнителей. Сравните ответы в чатах и выберите одного.
            </Typography>
          </Stack>
        )}

        {validationError && city && !error ? <Alert severity="warning">{validationError}</Alert> : null}
        {error ? <Alert severity="warning">{error}</Alert> : null}

        <Stack spacing={2}>
          <TextField
            label="Что нужно сделать?"
            value={form.message}
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            disabled={busy || !actor}
            fullWidth
            multiline
            minRows={3}
            required
          />

          <Stack spacing={2}>
            <LocationField
              label="Где нужны работы?"
              caption="Где нужны работы? *"
              helperText={!city ? "Выберите населённый пункт, чтобы продолжить." : undefined}
              value={city}
              onChange={(next) => {
                setCityOverride(next);
              }}
              disabled={busy || !actor}
              iconColor={city ? "primary" : "accent"}
            />

            <CadastralNumberChipsField
              value={form.cadastralNumbers}
              onChange={(cadastralNumbers) => setForm((prev) => ({ ...prev, cadastralNumbers }))}
              disabled={busy || !actor}
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
                        disabled={busy || !actor}
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
          loading={busy}
          disabled={isBlocked || !actor}
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
        {form.message || cityOverride || form.category || form.cadastralNumbers.some(p => p.some(Boolean)) ? (
          <Stack spacing={0.5}><Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center" }}>Черновик сохраняется в этой вкладке на 24 часа.</Typography><Button type="button" onClick={clearDraft} disabled={busy || !actor} sx={{ alignSelf: "center" }}>Очистить черновик</Button></Stack>
        ) : null}
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
