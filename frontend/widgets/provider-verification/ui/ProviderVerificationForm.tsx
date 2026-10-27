"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import type { ProviderVerificationView } from "../model/verification-view";

type FieldKey = "lastName" | "firstName" | "legalName" | "inn" | "ogrn";
type FieldErrors = Partial<Record<FieldKey, string>>;

function digitsOnly(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function clientFieldErrors(
  view: ProviderVerificationView,
  values: ProviderVerificationView["prefill"],
): FieldErrors {
  const errors: FieldErrors = {};
  if (view.providerType === "COMPANY") {
    if (!values.legalName.trim()) errors.legalName = "Укажите полное наименование";
    if (!/^\d{10}$/.test(values.inn)) errors.inn = "ИНН — 10 цифр";
    if (!/^\d{13}$/.test(values.ogrn)) errors.ogrn = "ОГРН — 13 цифр";
    return errors;
  }
  if (!values.lastName.trim()) errors.lastName = "Укажите фамилию";
  if (!values.firstName.trim()) errors.firstName = "Укажите имя";
  if (!/^\d{12}$/.test(values.inn)) errors.inn = "ИНН — 12 цифр";
  if (view.providerType === "SOLE_PROPRIETOR" && !/^\d{15}$/.test(values.ogrn)) {
    errors.ogrn = "ОГРНИП — 15 цифр";
  }
  return errors;
}

function readResponse(payload: unknown): { message: string | null; fieldErrors: FieldErrors } {
  if (!payload || typeof payload !== "object") {
    return { message: "Не удалось отправить заявку", fieldErrors: {} };
  }
  const body = payload as { message?: unknown; error?: string; fieldErrors?: FieldErrors };
  const fieldErrors =
    body.fieldErrors && typeof body.fieldErrors === "object" ? body.fieldErrors : {};
  if (Object.keys(fieldErrors).length > 0) {
    return { message: null, fieldErrors };
  }
  if (typeof body.message === "string" && body.message.trim()) {
    return { message: body.message, fieldErrors };
  }
  return { message: body.error ?? "Не удалось отправить заявку", fieldErrors };
}

type Props = {
  providerId: string;
  view: ProviderVerificationView;
};

export function ProviderVerificationForm({ providerId, view }: Props) {
  const router = useRouter();
  const [values, setValues] = useState(view.prefill);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isCompany = view.providerType === "COMPANY";
  const innLength = isCompany ? 10 : 12;
  const ogrnLength = view.providerType === "SOLE_PROPRIETOR" ? 15 : 13;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = clientFieldErrors(view, values);
    setFieldErrors(nextErrors);
    setError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      const response = await fetch(`/api/providers/${providerId}/verification`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          isCompany
            ? { legalName: values.legalName, inn: values.inn, ogrn: values.ogrn }
            : {
                lastName: values.lastName,
                firstName: values.firstName,
                middleName: values.middleName,
                inn: values.inn,
                ogrn: view.providerType === "SOLE_PROPRIETOR" ? values.ogrn : undefined,
              },
        ),
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        const parsed = readResponse(payload);
        setFieldErrors(parsed.fieldErrors);
        setError(parsed.message);
        return;
      }
      router.push("/pro/profile");
      router.refresh();
    } catch {
      setError("Не удалось отправить заявку");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Paper component="form" variant="outlined" sx={{ p: 2.5 }} onSubmit={onSubmit}>
      <Stack spacing={2}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Проверка реквизитов</Typography>
        <Alert severity={view.status === "VERIFIED" ? "warning" : "info"}>
          {view.status === "VERIFIED"
            ? "Профиль снова уйдёт на проверку, значок пропадёт."
            : "Реквизиты привязываются к профилю. После изменения реквизитов профиль снова уйдёт на проверку."}
        </Alert>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {isCompany ? (
          <TextField
            label="Полное наименование"
            value={values.legalName}
            onChange={(event) => setValues((current) => ({ ...current, legalName: event.target.value }))}
            error={Boolean(fieldErrors.legalName)}
            helperText={fieldErrors.legalName}
            fullWidth
          />
        ) : (
          <>
            <TextField
              label="Фамилия"
              value={values.lastName}
              onChange={(event) => setValues((current) => ({ ...current, lastName: event.target.value }))}
              error={Boolean(fieldErrors.lastName)}
              helperText={fieldErrors.lastName}
              fullWidth
            />
            <TextField
              label="Имя"
              value={values.firstName}
              onChange={(event) => setValues((current) => ({ ...current, firstName: event.target.value }))}
              error={Boolean(fieldErrors.firstName)}
              helperText={fieldErrors.firstName}
              fullWidth
            />
            <TextField
              label="Отчество"
              value={values.middleName}
              onChange={(event) => setValues((current) => ({ ...current, middleName: event.target.value }))}
              helperText="Необязательно"
              fullWidth
            />
          </>
        )}
        <TextField
          label="ИНН"
          value={values.inn}
          onChange={(event) =>
            setValues((current) => ({ ...current, inn: digitsOnly(event.target.value, innLength) }))
          }
          error={Boolean(fieldErrors.inn)}
          helperText={fieldErrors.inn ?? `${innLength} цифр`}
          slotProps={{ htmlInput: { inputMode: "numeric" } }}
          fullWidth
        />
        {view.providerType === "SELF_EMPLOYED" ? null : (
          <TextField
            label={view.providerType === "SOLE_PROPRIETOR" ? "ОГРНИП" : "ОГРН"}
            value={values.ogrn}
            onChange={(event) =>
              setValues((current) => ({ ...current, ogrn: digitsOnly(event.target.value, ogrnLength) }))
            }
            error={Boolean(fieldErrors.ogrn)}
            helperText={fieldErrors.ogrn ?? `${ogrnLength} цифр`}
            slotProps={{ htmlInput: { inputMode: "numeric" } }}
            fullWidth
          />
        )}
        <Button type="submit" variant="contained" loading={busy} sx={{ minHeight: 44, alignSelf: "flex-start" }}>
          Отправить на проверку
        </Button>
      </Stack>
    </Paper>
  );
}
