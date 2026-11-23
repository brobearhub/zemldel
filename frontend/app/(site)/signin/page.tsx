"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent } from "react";
import { resolvePostSignInPath } from "./resolve-post-sign-in-path";
import { authCardShellSx } from "@/app/(site)/auth-card-shell";
import { themedAuthBackground } from "@/app/(site)/auth-background";
import Link from "@/shared/ui/Link";
import { RainGlassPaper } from "@/shared/ui/RainGlassPaper";
import { LogoFull } from "@/shared/ui/LogoFull";
import { PasswordVisibilityButton } from "@/shared/ui/PasswordVisibilityButton";
import { PendingRequestAuthSummary, usePendingRequestContext } from "@/features/continue-request";
import { useClientInvitation } from "@/features/client-invitation/use-client-invitation";
import { RegistrationEmailForm } from "@/features/registration/RegistrationEmailForm";
import { clearRegistrationProgress, type RegistrationProgress } from "@/features/registration/registration-progress";
import { REQUEST_INTENT, REQUESTS_PROFILE_RESUME_URL, REQUESTS_PROFILE_URL } from "@/entities/request";

const signInShellSx = {
  ...authCardShellSx,
  backgroundImage: themedAuthBackground,
} as const;

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInPageFallback />}>
      <SignInPageContent />
    </Suspense>
  );
}

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
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [challenge, setChallenge] = useState<Extract<RegistrationProgress, { stage: "code" }> | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const reauthResetDone = useRef(false);
  const [reauthReady, setReauthReady] = useState(false);
  const { data: session, status } = useSession();

  const returnTo = searchParams.get("returnTo");
  const invitation = useClientInvitation(returnTo);
  const invitedEmail = invitation.preview?.email;
  const currentChallenge = !invitedEmail || challenge?.email === invitedEmail ? challenge : null;
  const showPassword = passwordRequired && (!invitedEmail || invitedEmail === email);
  const intent = searchParams.get("intent");
  const isRequestIntent = intent === REQUEST_INTENT;
  const pending = usePendingRequestContext({
    intent,
    kind: searchParams.get("kind"),
    serviceId: searchParams.get("serviceId"),
    categoryId: searchParams.get("categoryId"),
  });
  const effectiveReturnTo = isRequestIntent ? (pending.draft ? REQUESTS_PROFILE_RESUME_URL : REQUESTS_PROFILE_URL) : returnTo;
  const wrongAccount = isRequestIntent && status === "authenticated" && session?.user.accountKind === "PROVIDER";
  const passwordResetNotice = searchParams.get("notice") === "password-reset";
  const reauthenticate = searchParams.get("reauth") === "1";
  const signUpParams = new URLSearchParams(searchParams.toString());
  signUpParams.delete("notice");
  signUpParams.delete("reauth");
  const signUpQuery = signUpParams.toString();
  const signUpHref = signUpQuery ? `/signup?${signUpQuery}` : "/signup";

  const draftEmail = pending.draft?.kind === "SERVICE" ? pending.draft.customerEmail : null;
  const formDisabled = wrongAccount || (reauthenticate && !reauthReady);

  useEffect(() => {
    if (!reauthenticate || reauthResetDone.current || status === "loading") return;
    reauthResetDone.current = true;
    if (status === "authenticated") {
      void signOut({ redirect: false }).then(() => setReauthReady(true), () => setReauthReady(true));
    } else {
      setReauthReady(true);
    }
  }, [reauthenticate, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    if (reauthenticate) return;
    if (isRequestIntent && (!pending.loaded || session.user.accountKind === "PROVIDER")) return;
    const hasProviderMembership = session.user.memberships.some((membership) => membership.status === "ACTIVE");
    router.replace(
      resolvePostSignInPath({
        accountKind: session.user.accountKind === "PROVIDER" ? "PROVIDER" : "CUSTOMER",
        hasProviderMembership,
        returnTo: effectiveReturnTo,
      }),
    );
  }, [status, session, effectiveReturnTo, router, isRequestIntent, pending.loaded, reauthenticate]);

  function handleVerificationChange(progress: RegistrationProgress | null) {
    if (!progress || progress.stage === "code") {
      setChallenge(progress);
      return;
    }

    if (progress.accountKind) signUpParams.set("account", progress.accountKind.toLowerCase());
    if (isRequestIntent && progress.accountKind === "PROVIDER") {
      // Keep the customer draft until the user returns to it with a customer account.
      signUpParams.delete("intent");
    }
    const query = signUpParams.toString();
    router.push(query ? `/signup?${query}` : "/signup");
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading || formDisabled) return;
    const submittedPassword = new FormData(e.currentTarget).get("password");
    if (typeof submittedPassword !== "string" || !submittedPassword) {
      setPasswordError(true);
      setFormError("Введите пароль");
      return;
    }

    setFormError(null);
    setPasswordError(false);
    setLoading(true);
    try {
      const validateRes = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password: submittedPassword }),
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
        setPasswordError(true);
        return;
      }

      if (isRequestIntent && payload?.accountKind === "PROVIDER") {
        setFormError("Это аккаунт исполнителя. Для отправки заявки войдите в аккаунт клиента.");
        return;
      }

      const res = await signIn("credentials", {
        email,
        password: submittedPassword,
        redirect: false,
      });

      if (!res?.ok || res.error) {
        setFormError("Неверный email или пароль");
        setPasswordError(true);
        return;
      }

      const nextPath = resolvePostSignInPath({
        accountKind: payload?.accountKind === "PROVIDER" ? "PROVIDER" : "CUSTOMER",
        hasProviderMembership: payload?.hasProviderMembership === true,
        returnTo: effectiveReturnTo,
      });

      clearRegistrationProgress();
      router.push(nextPath);
      router.refresh();
    } catch {
      setFormError("Не удалось войти. Попробуйте ещё раз.");
      setPasswordError(true);
    } finally {
      setLoading(false);
    }
  };

  if (invitation.error) return <Box sx={signInShellSx}><Alert severity="warning">{invitation.error}</Alert></Box>;
  if (invitation.loading || status === "loading" || (isRequestIntent && !pending.loaded)) {
    return <SignInPageFallback />;
  }

  return (
    <Box sx={signInShellSx}>
      <RainGlassPaper sx={{ width: "100%", maxWidth: 420, p: 4 }}>
        <Stack spacing={2.5}>
          <Stack spacing={1} sx={{ alignItems: "center" }}>
            <LogoFull size={80} layout="right" tone="light" priority />
            {isRequestIntent ? <Typography component="h1" variant="h5" sx={{ color: "inherit", textAlign: "center" }}>{pending.loaded && !pending.draft ? "Вход в аккаунт" : "Вход для отправки заявки"}</Typography> : null}
          </Stack>

          {passwordResetNotice ? (
            <Alert severity="success">Пароль обновлён. Войдите с новым паролем.</Alert>
          ) : null}
          {reauthenticate ? <Alert severity="info">{pending.draft ? "Сессия завершилась. Заявка сохранена — войдите ещё раз, чтобы отправить её." : "Сессия завершилась. Войдите ещё раз."}</Alert> : null}
          {isRequestIntent ? <PendingRequestAuthSummary draft={pending.draft} loaded={pending.loaded} mode="signin" /> : null}
          {wrongAccount ? (
            <Alert severity="warning" action={<Button color="inherit" onClick={() => void signOut({ redirect: false })}>Сменить аккаунт</Button>}>
              Вы вошли как исполнитель. Для отправки заявки нужен аккаунт клиента. Черновик сохранён.
            </Alert>
          ) : null}
          {formError ? (
            <Alert severity="error" role="alert">
              {formError}
            </Alert>
          ) : null}
          {!showPassword ? (
            <RegistrationEmailForm
              mode="signin"
              disabled={formDisabled}
              accountKind={currentChallenge?.accountKind ?? null}
              fixedEmail={invitedEmail}
              initialEmail={email || draftEmail || ""}
              challenge={currentChallenge}
              notice={null}
              onChange={handleVerificationChange}
              onPasswordRequired={(verifiedEmail) => {
                setEmail(verifiedEmail);
                setChallenge(null);
                setPasswordRequired(true);
              }}
            />
          ) : (
            <Box component="form" onSubmit={onSubmit}>
              <Stack spacing={2.5}>
                <TextField
                  label="Email"
                  type="email"
                  name="email"
                  fullWidth
                  size="small"
                  autoComplete="username"
                  value={email}
                  slotProps={{ input: { readOnly: true } }}
                />
                <TextField
                  label="Пароль"
                  name="password"
                  type={passwordVisible ? "text" : "password"}
                  autoFocus
                  fullWidth
                  autoComplete="current-password"
                  size="small"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setPasswordError(false);
                    setFormError(null);
                  }}
                  disabled={loading}
                  error={passwordError}
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
                <Link href="/forgot-password" sx={{ color: "inherit", fontWeight: 600, minHeight: 44, display: "inline-flex", alignItems: "center", alignSelf: "flex-start" }}>
                  Забыли пароль?
                </Link>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  color="primary"
                  type="submit"
                  loading={loading}
                  disabled={formDisabled}
                >
                  {isRequestIntent && pending.draft ? "Войти и отправить заявку" : "Войти"}
                </Button>
                {!invitation.path && <Button
                  type="button"
                  color="inherit"
                  disabled={loading}
                  onClick={() => {
                    setPasswordRequired(false);
                    setPassword("");
                    setPasswordVisible(false);
                    setPasswordError(false);
                    setFormError(null);
                  }}
                >
                  Изменить email
                </Button>}
              </Stack>
            </Box>
          )}

          <Typography variant="body2" sx={{ opacity: 0.9, minHeight: 44, display: "flex", alignItems: "center" }}>
            Нет аккаунта?{" "}
            <Link href={signUpHref} sx={{ color: "inherit", fontWeight: 600, ml: 0.5 }}>
              Регистрация
            </Link>
          </Typography>
        </Stack>
      </RainGlassPaper>
    </Box>
  );
}

