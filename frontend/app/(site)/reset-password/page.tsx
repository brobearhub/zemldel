"use client";

import { Suspense, useState, type FormEvent } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { authCardShellSx } from "@/app/(site)/auth-card-shell";
import Link from "@/shared/ui/Link";
import { LogoFull } from "@/shared/ui/LogoFull";
import { PasswordVisibilityButton } from "@/shared/ui/PasswordVisibilityButton";
import { RainGlassPaper } from "@/shared/ui/RainGlassPaper";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Box sx={authCardShellSx} />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const nextPasswordError = password.length < 6 ? "Пароль должен быть не короче 6 символов" : null;
    const nextConfirmError = password !== confirm ? "Пароли не совпадают" : null;
    setPasswordError(nextPasswordError);
    setConfirmError(nextConfirmError);
    if (nextPasswordError || nextConfirmError || token.length < 20) {
      if (token.length < 20) setFormError("Ссылка недействительна или устарела. Запросите новую.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; fieldErrors?: { password?: string } }
        | null;
      if (!response.ok) {
        setPasswordError(payload?.fieldErrors?.password ?? null);
        setFormError(payload?.error ?? "Не удалось обновить пароль. Попробуйте ещё раз.");
        return;
      }
      router.push("/signin?notice=password-reset");
    } catch {
      setFormError("Не удалось обновить пароль. Попробуйте ещё раз.");
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
              Новый пароль
            </Typography>
          </Stack>
          {formError ? <Alert severity="error">{formError}</Alert> : null}
          <Box component="form" noValidate onSubmit={onSubmit}>
            <Stack spacing={2.5}>
              <TextField
                label="Новый пароль"
                type={passwordVisible ? "text" : "password"}
                fullWidth
                size="small"
                autoComplete="new-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                disabled={loading}
                error={Boolean(passwordError)}
                helperText={passwordError ?? " "}
                slotProps={{
                  input: {
                    endAdornment: (
                      <PasswordVisibilityButton
                        visible={passwordVisible}
                        onToggle={() => setPasswordVisible((current) => !current)}
                      />
                    ),
                  },
                }}
              />
              <TextField
                label="Повторите пароль"
                type={passwordVisible ? "text" : "password"}
                fullWidth
                size="small"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => {
                  setConfirm(event.target.value);
                  if (confirmError) setConfirmError(null);
                }}
                disabled={loading}
                error={Boolean(confirmError)}
                helperText={confirmError ?? " "}
              />
              <Button type="submit" variant="contained" size="large" fullWidth loading={loading} sx={{ minHeight: 44 }}>
                Сохранить пароль
              </Button>
            </Stack>
          </Box>
          <Link href="/forgot-password" sx={{ color: "inherit", fontWeight: 600, minHeight: 44, display: "inline-flex", alignItems: "center" }}>
            Запросить новую ссылку
          </Link>
        </Stack>
      </RainGlassPaper>
    </Box>
  );
}
