"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { setLastCabinetRole } from "@/widgets/cabinet-chrome/lib/cabinet-role-storage";
import { CabinetNotices } from "@/widgets/cabinet-chrome";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { CitySuggestItemDto } from "@/entities/city";
import { sitePageContainerSx } from "@/shared/config/site-layout";
import { LocationField } from "@/features/select-city";
import Link from "@/shared/ui/Link";
import {
  hasProviderOnboardingFieldErrors,
  validateProviderOnboarding,
  type ProviderOnboardingFieldErrors,
  type ProviderOnboardingType,
} from "./validate-provider-onboarding";

const TYPE_OPTIONS: Array<{ value: ProviderOnboardingType; label: string }> = [
  { value: "INDIVIDUAL", label: "Физлицо" },
  { value: "SELF_EMPLOYED", label: "Самозанятый" },
  { value: "SOLE_PROPRIETOR", label: "ИП" },
  { value: "COMPANY", label: "Организация" },
];

function digitsOnly(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function ProviderOnboardingForm() {
  const router = useRouter();
  const [type, setType] = useState<ProviderOnboardingType | null>(null);
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [inn, setInn] = useState("");
  const [ogrn, setOgrn] = useState("");
  const [contactLastName, setContactLastName] = useState("");
  const [contactFirstName, setContactFirstName] = useState("");
  const [contactMiddleName, setContactMiddleName] = useState("");
  const [city, setCity] = useState<CitySuggestItemDto | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProviderOnboardingFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [offerAcknowledged, setOfferAcknowledged] = useState(false);
  const [offerVersion, setOfferVersion] = useState<string | null>(null);
  const [offerLoadError, setOfferLoadError] = useState<string | null>(null);

  const isCompany = type === "COMPANY";
  const innLength = isCompany ? 10 : 12;
  const ogrnLength = type === "SOLE_PROPRIETOR" ? 15 : 13;
  const showOgrn = type === "SOLE_PROPRIETOR" || type === "COMPANY";

  useEffect(() => {
    let cancelled = false;
    async function loadOfferVersion() {
      try {
        const res = await fetch("/api/legal-docs/offer/current", { cache: "no-store" });
        const payload = (await res.json().catch(() => null)) as
          | { version?: string; error?: string }
          | null;
        if (!res.ok || !payload?.version) {
          throw new Error(payload?.error ?? "Не удалось загрузить оферту");
        }
        if (!cancelled) setOfferVersion(payload.version);
      } catch (e) {
        if (!cancelled) {
          setOfferLoadError(e instanceof Error ? e.message : "Не удалось загрузить оферту");
        }
      }
    }
    void loadOfferVersion();
    return () => {
      cancelled = true;
    };
  }, []);

  function clearField(key: keyof ProviderOnboardingFieldErrors) {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const nextErrors = validateProviderOnboarding({
      type,
      cityId: city?.id ?? null,
      lastName,
      firstName,
      legalName,
      inn,
      ogrn,
      contactLastName,
      contactFirstName,
    });
    setFieldErrors(nextErrors);
    if (hasProviderOnboardingFieldErrors(nextErrors)) return;

    if (!offerAcknowledged || !offerVersion || !type || !city?.id) {
      setError("Нужно подтвердить ознакомление с офертой на платные услуги");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/providers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type,
          cityId: city.id,
          offerVersion,
          legal: isCompany
            ? { legalName: legalName.trim(), inn, ogrn }
            : {
                lastName: lastName.trim(),
                firstName: firstName.trim(),
                ...(middleName.trim() ? { middleName: middleName.trim() } : {}),
                inn,
                ...(type === "SOLE_PROPRIETOR" ? { ogrn } : {}),
              },
          ...(isCompany
            ? {
                contact: {
                  lastName: contactLastName.trim(),
                  firstName: contactFirstName.trim(),
                  ...(contactMiddleName.trim() ? { middleName: contactMiddleName.trim() } : {}),
                },
              }
            : {}),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; message?: string | string[]; fieldErrors?: ProviderOnboardingFieldErrors }
        | null;

      if (!response.ok) {
        if (payload?.fieldErrors && Object.keys(payload.fieldErrors).length > 0) {
          setFieldErrors(payload.fieldErrors);
          return;
        }
        const message = Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message;
        setError(payload?.error ?? message ?? "Не удалось создать профиль исполнителя");
        return;
      }

      setLastCabinetRole("provider");
      router.push("/pro?welcome=1");
      router.refresh();
    } catch {
      setError("Не удалось создать профиль исполнителя");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <Container maxWidth="sm" sx={sitePageContainerSx}>
        <Paper sx={{ p: { xs: 2, sm: 4 } }}>
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                Профиль исполнителя
              </Typography>
              <Typography sx={{ color: "text.secondary" }}>
                Заполните профиль, чтобы публиковать услуги.
              </Typography>
            </Stack>

            <CabinetNotices welcome="Аккаунт исполнителя создан. Осталось заполнить профиль." />

            {error ? <Alert severity="error" role="alert">{error}</Alert> : null}
            {offerLoadError ? <Alert severity="error" role="alert">{offerLoadError}</Alert> : null}
            {fieldErrors.type ? <Alert severity="error" role="alert">{fieldErrors.type}</Alert> : null}

            <Box component="form" onSubmit={onSubmit}>
              <Stack spacing={2.5}>
                <Box
                  role="radiogroup"
                  aria-label="Тип профиля"
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr" },
                    gap: 1.5,
                  }}
                >
                  {TYPE_OPTIONS.map((option) => {
                    const selected = type === option.value;
                    return (
                      <Button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        variant={selected ? "contained" : "outlined"}
                        disabled={loading}
                        onClick={() => {
                          setType(option.value);
                          setFieldErrors({});
                          setInn("");
                          setOgrn("");
                        }}
                        sx={{ minHeight: 44, px: 1.5 }}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </Box>

                {type ? (
                  <Stack spacing={2}>
                    {isCompany ? (
                      <TextField
                        label="Полное наименование"
                        value={legalName}
                        onChange={(event) => {
                          setLegalName(event.target.value);
                          clearField("legalName");
                        }}
                        disabled={loading}
                        fullWidth
                        error={Boolean(fieldErrors.legalName)}
                        helperText={fieldErrors.legalName ?? " "}
                      />
                    ) : (
                      <PersonNameFields
                        lastName={lastName}
                        firstName={firstName}
                        middleName={middleName}
                        lastNameError={fieldErrors.lastName}
                        firstNameError={fieldErrors.firstName}
                        disabled={loading}
                        onLastName={(value) => {
                          setLastName(value);
                          clearField("lastName");
                        }}
                        onFirstName={(value) => {
                          setFirstName(value);
                          clearField("firstName");
                        }}
                        onMiddleName={setMiddleName}
                      />
                    )}

                    <TextField
                      label="ИНН"
                      value={inn}
                      onChange={(event) => {
                        setInn(digitsOnly(event.target.value, innLength));
                        clearField("inn");
                      }}
                      disabled={loading}
                      fullWidth
                      error={Boolean(fieldErrors.inn)}
                      helperText={fieldErrors.inn ?? `${innLength} цифр`}
                      slotProps={{ htmlInput: { inputMode: "numeric", maxLength: innLength } }}
                    />

                    {showOgrn ? (
                      <TextField
                        label={type === "SOLE_PROPRIETOR" ? "ОГРНИП" : "ОГРН"}
                        value={ogrn}
                        onChange={(event) => {
                          setOgrn(digitsOnly(event.target.value, ogrnLength));
                          clearField("ogrn");
                        }}
                        disabled={loading}
                        fullWidth
                        error={Boolean(fieldErrors.ogrn)}
                        helperText={fieldErrors.ogrn ?? `${ogrnLength} цифр`}
                        slotProps={{ htmlInput: { inputMode: "numeric", maxLength: ogrnLength } }}
                      />
                    ) : null}

                    {isCompany ? (
                      <Stack spacing={2}>
                        <Typography sx={{ fontWeight: 700 }}>Контактное лицо</Typography>
                        <PersonNameFields
                          lastName={contactLastName}
                          firstName={contactFirstName}
                          middleName={contactMiddleName}
                          lastNameError={fieldErrors.contactLastName}
                          firstNameError={fieldErrors.contactFirstName}
                          disabled={loading}
                          onLastName={(value) => {
                            setContactLastName(value);
                            clearField("contactLastName");
                          }}
                          onFirstName={(value) => {
                            setContactFirstName(value);
                            clearField("contactFirstName");
                          }}
                          onMiddleName={setContactMiddleName}
                        />
                      </Stack>
                    ) : null}

                    <LocationField
                      label="Город"
                      emptyLabel="Выберите город"
                      value={city}
                      onChange={(next) => {
                        setCity(next);
                        clearField("cityId");
                      }}
                      disabled={loading}
                      error={Boolean(fieldErrors.cityId)}
                      helperText={fieldErrors.cityId}
                    />
                  </Stack>
                ) : null}

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={offerAcknowledged}
                      onChange={(event) => setOfferAcknowledged(event.target.checked)}
                      disabled={loading || !offerVersion}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Ознакомлен(а) с{" "}
                      <Link
                        href="/offer"
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: "inherit", fontWeight: 700, textDecoration: "underline" }}
                      >
                        офертой на платные услуги платформы
                      </Link>
                      {offerVersion ? ` (версия ${offerVersion})` : ""}. Галочка подтверждает,
                      что текст оферты прочитан. Подключение и оплата услуг выполняются отдельно.
                    </Typography>
                  }
                  sx={{ alignItems: "flex-start", m: 0 }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || !offerAcknowledged || !offerVersion}
                  sx={{ minHeight: 44, alignSelf: "flex-start" }}
                >
                  Создать
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </main>
  );
}

function PersonNameFields(props: {
  lastName: string;
  firstName: string;
  middleName: string;
  lastNameError?: string;
  firstNameError?: string;
  disabled: boolean;
  onLastName: (value: string) => void;
  onFirstName: (value: string) => void;
  onMiddleName: (value: string) => void;
}) {
  return (
    <Stack spacing={2}>
      <TextField
        label="Фамилия"
        value={props.lastName}
        onChange={(event) => props.onLastName(event.target.value)}
        disabled={props.disabled}
        fullWidth
        error={Boolean(props.lastNameError)}
        helperText={props.lastNameError ?? " "}
      />
      <TextField
        label="Имя"
        value={props.firstName}
        onChange={(event) => props.onFirstName(event.target.value)}
        disabled={props.disabled}
        fullWidth
        error={Boolean(props.firstNameError)}
        helperText={props.firstNameError ?? " "}
      />
      <TextField
        label="Отчество"
        value={props.middleName}
        onChange={(event) => props.onMiddleName(event.target.value)}
        disabled={props.disabled}
        fullWidth
        helperText="Необязательно"
      />
    </Stack>
  );
}
