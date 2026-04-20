"use client";

import { Suspense } from "react";
import Link from "next/link";
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { SERVICE_REQUEST_INTENT } from "@/entities/service-request";

export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpPageFallback />}>
      <SignUpPageContent />
    </Suspense>
  );
}

function SignUpPageFallback() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        backgroundImage: "url('/hero-bg-house_static.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Paper
        elevation={10}
        sx={{
          width: "100%",
          maxWidth: 420,
          p: 4,
          backdropFilter: "blur(3px)",
          backgroundColor: "background.paper",
        }}
      />
    </Box>
  );
}

function SignUpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [legalError, setLegalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const intent = searchParams.get("intent");
  const returnTo = searchParams.get("returnTo");
  const signInHref = searchParams.toString() ? `/signin?${searchParams.toString()}` : "/signin";

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLegalError(null);

    if (!legalAccepted) {
      setLegalError("Чтобы продолжить, нужно принять оферту и политику конфиденциальности");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Не удалось зарегистрироваться");
        return;
      }

      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        router.push(signInHref);
        return;
      }

      const nextPath =
        intent === SERVICE_REQUEST_INTENT && returnTo
          ? returnTo
          : "/providers/new";

      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Не удалось зарегистрироваться. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        backgroundImage: "url('/hero-bg-house_static.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Paper
        elevation={10}
        sx={{
          width: "100%",
          maxWidth: 420,
          p: 4,
          backdropFilter: "blur(3px)",
          backgroundColor: "background.paper",
        }}
      >
        <Stack spacing={2.5}>
          <Typography variant="h4" component="h1" fontWeight={700} align="center" color="text.secondary">
            Регистрация
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Создайте аккаунт, чтобы начать работу.
          </Typography>

          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={2.5}>
              <TextField
                label="Имя"
                fullWidth
                autoComplete="name"
                size="medium"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
              <TextField
                label="Email"
                type="email"
                fullWidth
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <TextField
                label="Пароль"
                type="password"
                fullWidth
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                error={Boolean(error)}
                helperText={error ?? " "}
              />

              <FormControl error={Boolean(legalError)} variant="standard">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={legalAccepted}
                      onChange={(e) => {
                        setLegalAccepted(e.target.checked);
                        if (legalError) setLegalError(null);
                      }}
                      disabled={loading}
                    />
                  }
                  label={
                    <Typography variant="body2" color="text.secondary">
                      Я принимаю{" "}
                      <Link
                        href="/offer"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: "inherit", fontWeight: 700, textDecoration: "underline" }}
                      >
                        оферту
                      </Link>{" "}
                      и{" "}
                      <Link
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: "inherit", fontWeight: 700, textDecoration: "underline" }}
                      >
                        политику конфиденциальности
                      </Link>
                    </Typography>
                  }
                  sx={{ alignItems: "flex-start", m: 0 }}
                />
                <FormHelperText sx={{ mt: 0 }}>{legalError ?? " "}</FormHelperText>
              </FormControl>

              <Button
                variant="contained"
                size="large"
                fullWidth
                color="secondary"
                type="submit"
                disabled={loading || !legalAccepted}
              >
                Создать аккаунт
              </Button>
            </Stack>
          </Box>

          <Typography variant="body2" color="text.secondary">
            Уже есть аккаунт?{" "}
            <Link href={signInHref} style={{ color: "inherit", fontWeight: 600 }}>
              Войти
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}

