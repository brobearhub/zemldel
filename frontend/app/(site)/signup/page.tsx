"use client";

import { Suspense } from "react";
import Link from "next/link";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { REQUEST_INTENT as SERVICE_REQUEST_INTENT } from "@/entities/request";
import type { CitySuggestItemDto } from "@/entities/city";
import { LocationField } from "@/features/select-city";
import { Markdown } from "@/shared/ui/Markdown";
import { SITE_HEADER_HEIGHT_PX } from "@/shared/config/site-layout";
import { LogoIcon } from "@/shared/ui/LogoIcon";
import { RainGlassPaper } from "@/shared/ui/RainGlassPaper";
import { PasswordVisibilityButton } from "@/shared/ui/PasswordVisibilityButton";
import { DUPLICATE_EMAIL_MESSAGE, hasSignupFieldErrors, SIGNUP_PASSWORD_MIN_LENGTH, validateSignupForm } from "./validate-signup-form";

type LegalDocId = "terms" | "privacy" | "consent";

type DocState = {
  busy: boolean;
  error: string | null;
  version: string | null;
  markdown: string | null;
};

const emptyDoc = (): DocState => ({
  busy: false,
  error: null,
  version: null,
  markdown: null,
});

export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpPageFallback />}>
      <SignUpPageContent />
    </Suspense>
  );
}

const signUpShellSx = {
  flex: "1 0 auto",
  width: "100%",
  minHeight: "100dvh",
  display: "flex",
  alignItems: "safe center",
  justifyContent: "center",
  px: { xs: 1.5, sm: 2 },
  minWidth: 0,
  py: {
    xs: `${SITE_HEADER_HEIGHT_PX.xs + 16}px`,
    sm: `${SITE_HEADER_HEIGHT_PX.sm + 24}px`,
    md: 10,
  },
  backgroundImage: "url('/hero-bg-house_static.jpg')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
} as const;

type SignupAccount = "customer" | "provider";

function SignUpKindChoice({
  showRequestHint,
  onChoose,
}: {
  readonly showRequestHint: boolean;
  readonly onChoose: (account: SignupAccount) => void;
}) {
  return (
    <Box sx={{ ...signUpShellSx, alignItems: "center" }}>
      <RainGlassPaper sx={{ width: "100%", maxWidth: 440, px: { xs: 2, sm: 4 }, pt: { xs: 2.5, sm: 3.5 }, pb: { xs: 4, sm: 4 }, minWidth: 0 }}>
        <Stack spacing={2.5}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-around", minWidth: 0, gap: 1 }}>
          
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, minWidth: 0 }}>
              Регистрация
            </Typography>
            <LogoIcon size={60} tone="dark" priority sx={{ transform: { xs: "translateY(-0.4rem)", md: "translateY(-0.5rem)" } }} />
          </Box>
          
          {showRequestHint ? (
            <Typography variant="body2">
              Если зарегистрироваться как исполнитель, заявка не будет создана.
            </Typography>
          ) : null}
          <Button variant="contained" size="large" fullWidth onClick={() => onChoose("customer")} sx={{ minHeight: 44 }}>
            Клиент
          </Button>
          <Button variant="outlined" size="large" fullWidth color="primary" onClick={() => onChoose("provider")} sx={{ minHeight: 44 }}>
            Исполнитель
          </Button>
        </Stack>
      </RainGlassPaper>
    </Box>
  );
}

function SignUpPageFallback() {
  return (
    <Box sx={signUpShellSx}>
      <RainGlassPaper sx={{ width: "100%", maxWidth: 420, p: 4 }} />
    </Box>
  );
}

function SignUpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const submitted = useRef(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [duplicateEmail, setDuplicateEmail] = useState(false);
  const [customerCity, setCustomerCity] = useState<CitySuggestItemDto | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [cityError, setCityError] = useState<string | null>(null);
  const [termsPrivacyAccepted, setTermsPrivacyAccepted] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [legalError, setLegalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [legalDocOpen, setLegalDocOpen] = useState<LegalDocId | null>(null);
  const [docs, setDocs] = useState<Record<LegalDocId, DocState>>({
    terms: emptyDoc(),
    privacy: emptyDoc(),
    consent: emptyDoc(),
  });
  const [versionsReady, setVersionsReady] = useState(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);

  const intent = searchParams.get("intent");
  const returnTo = searchParams.get("returnTo");
  const accountParam = searchParams.get("account");
  const accountKind = accountParam === "provider" ? "PROVIDER" : accountParam === "customer" ? "CUSTOMER" : null;
  const signInHref = searchParams.toString() ? `/signin?${searchParams.toString()}` : "/signin";

  const chooseAccount = (account: SignupAccount) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("account", account);
    router.replace(`/signup?${params.toString()}`);
  };

  const passwordMismatch = confirmPassword.length > 0 && confirmPassword !== password;

  useEffect(() => {
    if (submitted.current || status !== "authenticated" || !session?.user) return;
    const hasProviderMembership = session.user.memberships.some((membership) => membership.status === "ACTIVE");
    router.replace(
      session.user.accountKind === "PROVIDER"
        ? hasProviderMembership
          ? "/pro"
          : "/providers/new"
        : "/profile",
    );
  }, [status, session, router]);

  useEffect(() => {
    let cancelled = false;
    async function loadVersions() {
      setVersionsError(null);
      try {
        const ids: LegalDocId[] = ["terms", "privacy", "consent"];
        const results = await Promise.all(
          ids.map(async (id) => {
            const res = await fetch(`/api/legal-docs/${id}/current`, { cache: "no-store" });
            const payload = (await res.json().catch(() => null)) as
              | { version?: string; error?: string }
              | null;
            if (!res.ok || !payload?.version) {
              throw new Error(payload?.error ?? `Не удалось загрузить ${id}`);
            }
            return [id, payload.version] as const;
          }),
        );
        if (cancelled) return;
        setDocs((prev) => {
          const next = { ...prev };
          for (const [id, version] of results) {
            next[id] = { ...next[id], version };
          }
          return next;
        });
        setVersionsReady(true);
      } catch (e) {
        if (!cancelled) {
          setVersionsError(e instanceof Error ? e.message : "Не удалось загрузить версии документов");
        }
      }
    }
    void loadVersions();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openLegalDoc(doc: LegalDocId) {
    setLegalDocOpen(doc);
    setDocs((prev) => {
      if (prev[doc].busy || prev[doc].markdown) return prev;
      return { ...prev, [doc]: { ...prev[doc], busy: true, error: null } };
    });

    const current = docs[doc];
    if (current.busy || current.markdown) return;

    try {
      const res = await fetch(`/api/legal-docs/${doc}/current`, { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as
        | { version?: string; markdown?: string; title?: string; error?: string }
        | null;
      if (!res.ok || !payload?.markdown || !payload.version) {
        throw new Error(payload?.error ?? "Не удалось загрузить документ");
      }
      setDocs((prev) => ({
        ...prev,
        [doc]: {
          busy: false,
          error: null,
          version: payload.version ?? null,
          markdown: payload.markdown ?? null,
        },
      }));
    } catch (e) {
      setDocs((prev) => ({
        ...prev,
        [doc]: {
          ...prev[doc],
          busy: false,
          error: e instanceof Error ? e.message : "Не удалось загрузить документ",
        },
      }));
    }
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setFormError(null);
    setCityError(null);
    setLegalError(null);
    setConfirmPasswordError(null);
    setDuplicateEmail(false);

    const fieldErrors = validateSignupForm({
      name,
      email,
      password,
      confirmPassword,
      hasCity: Boolean(customerCity?.id),
      termsPrivacyAccepted,
      consentAccepted,
    });
    setNameError(fieldErrors.name);
    setEmailError(fieldErrors.email);
    setPasswordError(fieldErrors.password);
    setConfirmPasswordError(fieldErrors.confirmPassword);
    setCityError(fieldErrors.city);
    setLegalError(fieldErrors.legal);

    const terms = docs.terms.version;
    const privacy = docs.privacy.version;
    const consent = docs.consent.version;
    if (!terms || !privacy || !consent) {
      setLegalError("Версии документов ещё не загружены. Подождите или обновите страницу.");
      return;
    }

    if (hasSignupFieldErrors(fieldErrors) || !accountKind || !customerCity?.id) {
      if (!accountKind) setFormError("Выберите, кем зарегистрироваться");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          customerCityId: customerCity.id,
          accountKind,
          acceptedLegal: { terms, privacy, consent },
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | {
            fieldErrors?: {
              name?: string;
              email?: string;
              password?: string;
              customerCityId?: string;
              acceptedLegal?: string;
            };
            error?: string;
            message?: string;
          }
          | null;

        if (data?.fieldErrors) {
          setNameError(data.fieldErrors.name ?? null);
          const serverEmailError = data.fieldErrors.email ?? null;
          setEmailError(serverEmailError);
          setDuplicateEmail(serverEmailError === DUPLICATE_EMAIL_MESSAGE);
          setPasswordError(data.fieldErrors.password ?? null);
          setCityError(data.fieldErrors.customerCityId ?? null);
          if (data.fieldErrors.acceptedLegal) setLegalError(data.fieldErrors.acceptedLegal);
        }

        const fallback = data?.error ?? data?.message ?? "Не удалось зарегистрироваться";
        const onlyDuplicate =
          data?.fieldErrors?.email === DUPLICATE_EMAIL_MESSAGE &&
          !data.fieldErrors.name &&
          !data.fieldErrors.password &&
          !data.fieldErrors.customerCityId &&
          !data.fieldErrors.acceptedLegal;
        if (!onlyDuplicate && (!data?.fieldErrors || Object.values(data.fieldErrors).every((v) => !v))) {
          setFormError(fallback);
        }
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
        accountKind === "PROVIDER"
          ? "/providers/new?welcome=1"
          : intent === SERVICE_REQUEST_INTENT && returnTo
            ? returnTo
            : "/profile?welcome=1";

      submitted.current = true;
      router.push(nextPath);
      router.refresh();
    } catch {
      setFormError("Не удалось зарегистрироваться. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const openDoc = legalDocOpen ? docs[legalDocOpen] : null;
  const dialogTitle =
    legalDocOpen === "terms"
      ? "Пользовательское соглашение"
      : legalDocOpen === "privacy"
        ? "Политика обработки персональных данных"
        : legalDocOpen === "consent"
          ? "Согласие на обработку персональных данных"
          : "";

  if (!accountKind) {
    return (
      <SignUpKindChoice
        showRequestHint={intent === SERVICE_REQUEST_INTENT}
        onChoose={chooseAccount}
      />
    );
  }

  const registrationTitle = accountKind === "PROVIDER" ? "Регистрация исполнителя" : "Регистрация клиента";
  const emailHelper = emailError && emailError !== DUPLICATE_EMAIL_MESSAGE ? emailError : " ";

  return (
    <Box sx={signUpShellSx}>
      <RainGlassPaper
        sx={{
          width: "100%",
          maxWidth: { xs: 440, md: 920 },
          minWidth: 0,
          p: { xs: 2, sm: 4, md: 5 },
        }}
      >
        <Box component="form" onSubmit={onSubmit} sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
          <Box
            sx={{
              display: "grid",
              width: "100%",
              minWidth: 0,
              gridTemplateColumns: { xs: "1fr", md: "1fr 30px 1fr" },
              rowGap: { xs: 2.5, md: 0 },
              columnGap: { md: 4 },
              alignItems: { xs: "start", md: "stretch" },
            }}
          >
            <Box
              sx={{
                gridColumn: { xs: "1", md: "1 / -1" },
                width: "100%",
                minWidth: 0,
                mb: { md: 2.5 },
              }}
            >
              <Box 
                sx={{ 
                  display: "flex", 
                  alignItems: "center", 
                  minWidth: 0,
                  pb: { md: 1.5 },
                }}>
                <IconButton
                  type="button"
                  aria-label="Изменить роль"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete("account");
                    const query = params.toString();
                    router.replace(query ? `/signup?${query}` : "/signup");
                  }}
                  sx={{
                    flex: "0 0 44px",
                    color: "inherit",
                    minWidth: 44,
                    minHeight: 44,
                  }}
                >
                  <ArrowBackIosIcon sx={{ fontSize: 18, ml: "2px" }} />
                </IconButton>
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    flex: "1 1 auto",
                    minWidth: 0,
                    fontWeight: 700,
                    textAlign: "center",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                    fontSize: { xs: 20, sm: 22, md: 34 },
                    lineHeight: 1.2,
                  }}
                >
                  {registrationTitle}
                </Typography>
                <Box aria-hidden sx={{ flex: "0 0 44px" }} />
              </Box>
              <Box
                aria-hidden
                sx={{
                  display: { xs: "block", md: "none" },
                  mt: 2,
                  ml: { xs: -2, sm: -4 },
                  width: { xs: "calc(100% + 32px)", sm: "calc(100% + 64px)" },
                  height: "1px",
                  bgcolor: "primary.main",
                  opacity: 0.3,
                }}
              />
            </Box>

            <Stack 
              spacing={2.5} 
              sx={{ 
                width: "100%", 
                minWidth: 0, 
                wordBreak: "break-word",  
              }}
            >
              {duplicateEmail ? (
                <Alert severity="warning" role="alert">
                  Этот email уже зарегистрирован.{" "}
                  <Link href={signInHref} style={{ color: "inherit", fontWeight: 700 }}>
                    Войти
                  </Link>
                </Alert>
              ) : null}
              {formError ? (
                <Alert severity="warning" role="alert">
                  {formError}
                </Alert>
              ) : null}
              {versionsError ? (
                <Alert severity="error" role="alert">
                  {versionsError}
                </Alert>
              ) : null}

              <Stack 
                spacing={0.5} 
                sx={{ 
                  minWidth: 0,
                  pt: 1.5,
                }}>
                <TextField
                  label="Имя"
                  fullWidth
                  autoComplete="name"
                  size="small"
                  margin="dense"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  disabled={loading}
                  error={Boolean(nameError)}
                  helperText={nameError ?? " "}
                  slotProps={{
                    htmlInput: { maxLength: 120, suppressHydrationWarning: true },
                    formHelperText: { sx: { mt: 0.5, minHeight: 18 } },
                  }}
                />
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  autoComplete="email"
                  size="small"
                  margin="dense"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                    if (duplicateEmail) setDuplicateEmail(false);
                  }}
                  disabled={loading}
                  error={Boolean(emailError)}
                  helperText={emailHelper}
                  slotProps={{
                    htmlInput: { maxLength: 120 },
                    formHelperText: { sx: { mt: 0.5, minHeight: 18 } },
                  }}
                />
                <TextField
                  label="Пароль"
                  type={passwordVisible ? "text" : "password"}
                  fullWidth
                  autoComplete="new-password"
                  size="small"
                  margin="dense"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                    if (confirmPasswordError) setConfirmPasswordError(null);
                  }}
                  disabled={loading}
                  error={Boolean(passwordError)}
                  helperText={passwordError ?? `Не короче ${SIGNUP_PASSWORD_MIN_LENGTH} символов`}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <PasswordVisibilityButton
                          visible={passwordVisible}
                          onToggle={() => setPasswordVisible((current) => !current)}
                        />
                      ),
                    },
                    htmlInput: { maxLength: 120 },
                    formHelperText: { sx: { mt: 0.5, minHeight: 18 } },
                  }}
                />
                <TextField
                  label="Подтвердите пароль"
                  type={confirmPasswordVisible ? "text" : "password"}
                  fullWidth
                  autoComplete="new-password"
                  size="small"
                  margin="dense"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (confirmPasswordError) setConfirmPasswordError(null);
                  }}
                  disabled={loading}
                  error={passwordMismatch || Boolean(confirmPasswordError)}
                  helperText={confirmPasswordError ?? (passwordMismatch ? "Пароль должен совпадать" : " ")}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <PasswordVisibilityButton
                          visible={confirmPasswordVisible}
                          onToggle={() => setConfirmPasswordVisible((current) => !current)}
                        />
                      ),
                    },
                    htmlInput: { maxLength: 120 },
                    formHelperText: { sx: { mt: 0.5, minHeight: 18 } },
                  }}
                />
              </Stack>
            </Stack>

            <Box
              aria-hidden
              sx={{
                display: { xs: "none", md: "flex" },
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
              }}
            >
              <Box sx={{ width: "1px", bgcolor: "primary.main", flex: 1, borderRadius: 1, opacity: 0.3 }} />
              <LogoIcon size={70} priority />
              <Box sx={{ width: "1px", bgcolor: "primary.main", flex: 1, borderRadius: 1, opacity: 0.3 }} />
            </Box>

            <Stack spacing={2.5} sx={{ width: "100%", minWidth: 0, wordBreak: "break-word" }}>
              <Box sx={{ display: "flex", justifyContent: "center", transform: { xs: "translateY(-0.5rem)", md: "translateY(0)" } }}>
                <LocationField
                  label="Город"
                  emptyLabel="Выберите город"
                  tone="light"
                  value={customerCity}
                  onChange={(next) => {
                    setCustomerCity(next);
                    if (cityError) setCityError(null);
                  }}
                  disabled={loading}
                  error={Boolean(cityError)}
                  helperText={cityError ?? undefined}
                />
              </Box>

              <FormControl error={Boolean(legalError)} variant="standard" sx={{ minWidth: 0 }}>
                <Stack spacing={1}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={termsPrivacyAccepted}
                        onChange={(e) => {
                          setTermsPrivacyAccepted(e.target.checked);
                          if (legalError) setLegalError(null);
                        }}
                        disabled={loading || !versionsReady}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ opacity: 0.9, overflowWrap: "anywhere" }}>
                        Принимаю{" "}
                        <Link
                          href="/terms"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void openLegalDoc("terms");
                          }}
                          style={{ color: "inherit", fontWeight: 700, textDecoration: "underline" }}
                        >
                          пользовательское соглашение
                        </Link>{" "}
                        и{" "}
                        <Link
                          href="/privacy"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void openLegalDoc("privacy");
                          }}
                          style={{ color: "inherit", fontWeight: 700, textDecoration: "underline" }}
                        >
                          политику обработки персональных данных
                        </Link>
                        . Это правила сервиса.
                      </Typography>
                    }
                    sx={{ alignItems: "flex-start", m: 0, width: "100%", minWidth: 0, "& .MuiFormControlLabel-label": { minWidth: 0 } }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={consentAccepted}
                        onChange={(e) => {
                          setConsentAccepted(e.target.checked);
                          if (legalError) setLegalError(null);
                        }}
                        disabled={loading || !versionsReady}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ opacity: 0.9, overflowWrap: "anywhere" }}>
                        Даю отдельное{" "}
                        <Link
                          href="/consent"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void openLegalDoc("consent");
                          }}
                          style={{ color: "inherit", fontWeight: 700, textDecoration: "underline" }}
                        >
                          согласие на обработку персональных данных
                        </Link>
                      </Typography>
                    }
                    sx={{ alignItems: "flex-start", m: 0, width: "100%", minWidth: 0, "& .MuiFormControlLabel-label": { minWidth: 0 } }}
                  />
                </Stack>
                <FormHelperText sx={{ mt: 0 }}>{legalError ?? " "}</FormHelperText>
              </FormControl>

              <Button
                variant="contained"
                size="large"
                fullWidth
                color="secondary"
                type="submit"
                disabled={loading || !versionsReady}
                sx={{ minHeight: 44 }}
              >
                Создать аккаунт
              </Button>
              {!versionsReady && !versionsError ? (
                <Typography variant="body2" sx={{ textAlign: "center" }}>
                  Загружаем документы…
                </Typography>
              ) : null}
            </Stack>

            <Typography
              variant="body2"
              sx={{
                opacity: 0.9,
                gridColumn: { xs: "1", md: "1 / -1" },
                textAlign: "center",
                mt: { xs: 0, md: 2.5 },
                fontWeight: 300,
                fontSize: 12,
                color: "text.secondary",
              }}
            >
              Уже есть аккаунт?{" "}
              <Link href={signInHref} style={{ color: "inherit", fontWeight: 700, fontSize: 14 }}>
                Войти
              </Link>
            </Typography>
          </Box>
        </Box>
      </RainGlassPaper>

      <Dialog
        open={Boolean(legalDocOpen)}
        onClose={() => setLegalDocOpen(null)}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            {openDoc?.version ? (
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Версия: {openDoc.version}
              </Typography>
            ) : null}
            {openDoc?.error ? <Alert severity="error">{openDoc.error}</Alert> : null}
            {openDoc?.busy ? <Typography sx={{ opacity: 0.8 }}>Загрузка…</Typography> : null}
            {!openDoc?.busy && openDoc?.markdown ? (
              <Markdown markdown={openDoc.markdown} skipFirstH1 />
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLegalDocOpen(null)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
