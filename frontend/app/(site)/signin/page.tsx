"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { REQUEST_INTENT as SERVICE_REQUEST_INTENT } from "@/entities/request";
import { areSignInFieldsFilled } from "./are-sign-in-fields-filled";

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInPageFallback />}>
      <SignInPageContent />
    </Suspense>
  );
}

const signInShellSx = {
  minHeight: "100dvh",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  px: 2,
  backgroundImage: "url('/hero-bg-house_static_day.jpg')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
} as const;

function SignInPageFallback() {
  return (
    <Box sx={signInShellSx}>
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

function SignInPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const intent = searchParams.get("intent");
  const returnTo = searchParams.get("returnTo");
  const signUpHref = searchParams.toString() ? `/signup?${searchParams.toString()}` : "/signup";

  const canSubmit = areSignInFieldsFilled(email, password);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!areSignInFieldsFilled(email, password)) {
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Неверный email или пароль");
        return;
      }

      const nextPath =
        intent === SERVICE_REQUEST_INTENT && returnTo
          ? returnTo
          : "/";

      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Не удалось войти. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={signInShellSx}>
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
          {/* <Typography variant="h4" component="h1" fontWeight={700} align="center" color="text.secondary">
            Аккаунт
          </Typography> */}

          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={2.5}>
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                error={Boolean(error)}
                helperText={error ?? " "}
              />

              <Button
                variant="contained"
                size="large"
                fullWidth
                color="primary"
                type="submit"
                disabled={loading || !canSubmit}
              >
                Войти
              </Button>
            </Stack>
          </Box>

          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Нет аккаунта?{" "}
            <Link href={signUpHref} style={{ color: "inherit", fontWeight: 600 }}>
              Регистрация
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}

