"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent } from "react";
import { resolvePostSignInPath } from "./resolve-post-sign-in-path";
import { SITE_HEADER_HEIGHT_PX } from "@/shared/config/site-layout";
import { RainGlassPaper } from "@/shared/ui/RainGlassPaper";
import { LogoFull } from "@/shared/ui/LogoFull";
import { PasswordVisibilityButton } from "@/shared/ui/PasswordVisibilityButton";

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInPageFallback />}>
      <SignInPageContent />
    </Suspense>
  );
}

const signInShellSx = {
  flex: "1 0 auto",
  width: "100%",
  minHeight: "100dvh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  px: 2,
  py: {
    xs: `${SITE_HEADER_HEIGHT_PX.xs + 16}px`,
    sm: `${SITE_HEADER_HEIGHT_PX.sm + 24}px`,
    md: 10,
  },
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
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const { data: session, status } = useSession();

  const returnTo = searchParams.get("returnTo");
  const signUpHref = searchParams.toString() ? `/signup?${searchParams.toString()}` : "/signup";

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    const hasProviderMembership = session.user.memberships.some((membership) => membership.status === "ACTIVE");
    router.replace(
      resolvePostSignInPath({
        accountKind: session.user.accountKind === "PROVIDER" ? "PROVIDER" : "CUSTOMER",
        hasProviderMembership,
        returnTo,
      }),
    );
  }, [status, session, returnTo, router]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const emailMissing = email.trim().length === 0;
    const passwordMissing = password.length === 0;
    setEmailError(emailMissing);
    setPasswordError(passwordMissing);
    setFormError(emailMissing || passwordMissing ? "Укажите email и пароль" : null);
    if (emailMissing || passwordMissing) return;
    setLoading(true);

    try {
      const validateRes = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await validateRes.json().catch(() => null)) as
        | {
            fieldErrors?: { email?: string; password?: string };
            error?: string;
            accountKind?: string;
            hasProviderMembership?: boolean;
          }
        | null;

      if (!validateRes.ok) {
        const message = payload?.error ?? payload?.fieldErrors?.password ?? payload?.fieldErrors?.email ?? "Не удалось войти. Попробуйте ещё раз.";
        setFormError(message);
        setEmailError(true);
        setPasswordError(true);
        return;
      }

      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setFormError("Неверный email или пароль");
        setEmailError(true);
        setPasswordError(true);
        return;
      }

      const nextPath = resolvePostSignInPath({
        accountKind: payload?.accountKind === "PROVIDER" ? "PROVIDER" : "CUSTOMER",
        hasProviderMembership: payload?.hasProviderMembership === true,
        returnTo,
      });

      router.push(nextPath);
      router.refresh();
    } catch {
      setFormError("Не удалось войти. Попробуйте ещё раз.");
      setEmailError(true);
      setPasswordError(true);
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

          {formError ? (
            <Alert severity="error" role="alert">
              {formError}
            </Alert>
          ) : null}
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
                  if (emailError) setEmailError(false);
                  if (formError) setFormError(null);
                }}
                disabled={loading}
                error={emailError}
                helperText=" "
              />
              <TextField
                label="Пароль"
                type={passwordVisible ? "text" : "password"}
                fullWidth
                autoComplete="current-password"
                size="small"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(false);
                  if (formError) setFormError(null);
                }}
                disabled={loading}
                error={passwordError}
                helperText=" "
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

              <Button
                variant="contained"
                size="large"
                fullWidth
                color="primary"
                type="submit"
                disabled={loading}
                sx={{ minHeight: 44 }}
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

