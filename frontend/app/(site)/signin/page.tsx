"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { isSafeReturnToPath } from "@/core/auth/session-recovery";
import { areSignInFieldsFilled } from "./are-sign-in-fields-filled";
import { RainGlassPaper } from "@/shared/ui/RainGlassPaper";
import { LogoFull } from "@/shared/ui/LogoFull";

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInPageFallback />}>
      <SignInPageContent />
    </Suspense>
  );
}

const signInShellSx = {
  flex: 1,
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  px: 2,
  py: { xs: 6, sm: 8, md: 10 },
  backgroundImage: "url('/hero-bg-house_static_day.jpg')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
} as const;

function SignInPageFallback() {
  return (
    <Box sx={signInShellSx}>
      <RainGlassPaper sx={{ width: "100%", maxWidth: 420, p: 4 }} />
    </Box>
  );
}

function SignInPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const returnTo = searchParams.get("returnTo");
  const signUpHref = searchParams.toString() ? `/signup?${searchParams.toString()}` : "/signup";

  const canSubmit = areSignInFieldsFilled(email, password);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!areSignInFieldsFilled(email, password)) {
      return;
    }
    setEmailError(null);
    setPasswordError(null);
    setLoading(true);

    try {
      const validateRes = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!validateRes.ok) {
        const payload = (await validateRes.json().catch(() => null)) as
          | { fieldErrors?: { email?: string; password?: string }; error?: string }
          | null;
        setEmailError(payload?.fieldErrors?.email ?? null);
        setPasswordError(payload?.fieldErrors?.password ?? payload?.error ?? "Не удалось войти. Попробуйте ещё раз.");
        return;
      }

      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setPasswordError("Неверный email или пароль");
        return;
      }

      const nextPath = isSafeReturnToPath(returnTo) ? returnTo : "/";

      router.push(nextPath);
      router.refresh();
    } catch {
      setPasswordError("Не удалось войти. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={signInShellSx}>
      <RainGlassPaper sx={{ width: "100%", maxWidth: 420, p: 4 }}>
        <Stack spacing={2.5}>
          <Stack spacing={1} direction="column" sx={{ alignItems: "center", justifyContent: "center" }}>
            <Stack spacing={1}>
              <LogoFull size={80} layout="right" tone="light" priority />
            </Stack>
            
           
          </Stack>
          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={2.5}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                size="small"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                disabled={loading}
                error={Boolean(emailError)}
                helperText={emailError ?? " "}
              />
              <TextField
                label="Пароль"
                type="password"
                fullWidth
                autoComplete="current-password"
                size="small"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                disabled={loading}
                error={Boolean(passwordError)}
                helperText={passwordError ?? " "}
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

          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Нет аккаунта?{" "}
            <Link href={signUpHref} style={{ color: "inherit", fontWeight: 600 }}>
              Регистрация
            </Link>
          </Typography>
        </Stack>
      </RainGlassPaper>
    </Box>
  );
}

