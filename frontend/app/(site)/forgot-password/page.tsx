"use client";

import { useState, type FormEvent } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { authCardShellSx } from "@/app/(site)/auth-card-shell";
import Link from "@/shared/ui/Link";
import { LogoFull } from "@/shared/ui/LogoFull";
import { RainGlassPaper } from "@/shared/ui/RainGlassPaper";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Укажите корректный email");
      return;
    }
    setEmailError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; error?: string; fieldErrors?: { email?: string } }
        | null;
      if (!response.ok) {
        setEmailError(payload?.fieldErrors?.email ?? null);
        setFormError(payload?.error ?? "Не удалось отправить ссылку. Попробуйте ещё раз.");
        return;
      }
      setSuccess(payload?.message ?? "Если аккаунт с таким email есть, мы отправили ссылку для сброса пароля.");
    } catch {
      setFormError("Не удалось отправить ссылку. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={authCardShellSx}>
      <RainGlassPaper sx={{ width: "100%", maxWidth: 420, p: 4 }}>
        <Stack spacing={2.5}>
          <Stack spacing={1} sx={{ alignItems: "center" }}>
            <LogoFull size={80} layout="right" tone="light" priority />
            <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
              Забыли пароль?
            </Typography>
          </Stack>
          <Typography variant="body2">
            Укажите email аккаунта. Если он зарегистрирован, мы отправим ссылку для нового пароля.
          </Typography>
          {formError ? <Alert severity="error">{formError}</Alert> : null}
          {success ? <Alert severity="success">{success}</Alert> : null}
          <Box component="form" noValidate onSubmit={onSubmit}>
            <Stack spacing={2.5}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                size="small"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (emailError) setEmailError(null);
                }}
                disabled={loading}
                error={Boolean(emailError)}
                helperText={emailError ?? " "}
              />
              <Button type="submit" variant="contained" size="large" fullWidth loading={loading} sx={{ minHeight: 44 }}>
                Отправить ссылку
              </Button>
            </Stack>
          </Box>
          <Link href="/signin" sx={{ color: "inherit", fontWeight: 600, minHeight: 44, display: "inline-flex", alignItems: "center" }}>
            Вернуться ко входу
          </Link>
        </Stack>
      </RainGlassPaper>
    </Box>
  );
}
