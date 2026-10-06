"use client";

import { Suspense } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Stack,
  TextField,
  TextFieldProps,
  Typography,
} from "@mui/material";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { REQUEST_INTENT as SERVICE_REQUEST_INTENT } from "@/entities/request";
import type { CitySuggestItemDto } from "@/entities/city";
import { CityAutocomplete } from "@/shared/ui/CityAutocomplete";
import { Markdown } from "@/shared/ui/Markdown";
import { RainGlassPaper } from "@/shared/ui/RainGlassPaper";
import { LogoIcon } from "@/shared/ui/LogoIcon";

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
  flex: 1,
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  px: 2,
  py: { xs: 6, sm: 8, md: 10 },
  backgroundImage: "url('/hero-bg-house_static.jpg')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
} as const;

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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
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
  const signInHref = searchParams.toString() ? `/signin?${searchParams.toString()}` : "/signin";

  const shouldConfirmPassword = password.length > 0;
  const passwordMismatch = shouldConfirmPassword && confirmPassword.length > 0 && confirmPassword !== password;

  useEffect(() => {
    if (!shouldConfirmPassword) {
      setConfirmPassword("");
      setConfirmPasswordError(null);
    }
  }, [shouldConfirmPassword]);

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

    if (passwordMismatch) {
      setConfirmPasswordError("Пароль должен совпадать");
      return;
    }

    if (!termsPrivacyAccepted || !consentAccepted) {
      setLegalError("Чтобы продолжить, нужно принять соглашение, политику и дать согласие на обработку ПДн");
      return;
    }

    const terms = docs.terms.version;
    const privacy = docs.privacy.version;
    const consent = docs.consent.version;
    if (!terms || !privacy || !consent) {
      setLegalError("Версии документов ещё не загружены. Подождите или обновите страницу.");
      return;
    }

    if (!customerCity?.id) {
      setCityError("Выберите локацию из списка");
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
          setEmailError(data.fieldErrors.email ?? null);
          setPasswordError(data.fieldErrors.password ?? null);
          setCityError(data.fieldErrors.customerCityId ?? null);
          if (data.fieldErrors.acceptedLegal) setLegalError(data.fieldErrors.acceptedLegal);
        }

        const fallback = data?.error ?? data?.message ?? "Не удалось зарегистрироваться";
        if (!data?.fieldErrors || Object.values(data.fieldErrors).every((v) => !v)) {
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

      const nextPath = intent === SERVICE_REQUEST_INTENT && returnTo ? returnTo : "/welcome";

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

  return (
    <Box sx={signUpShellSx}>
      <RainGlassPaper
        validationTone="warning"
        sx={{
          width: "100%",
          maxWidth: { xs: 420, md: 920 },
          p: { xs: 4, md: 5 },
        }}
      >
        <Box component="form" onSubmit={onSubmit}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 30px 1fr" },
              rowGap: { xs: 2.5, md: 0 },
              columnGap: { md: 4 },
              alignItems: { xs: "start", md: "stretch" },
            }}
          >
            <Stack spacing={2.5}>
              <Stack spacing={1} direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Typography
                    variant="h4"
                    component="h1"
                    sx={{
                      fontWeight: 700,
                      textAlign: { xs: "center", md: "left" },
                    }}
                  >
                    Регистрация
                </Typography>
                <LogoIcon size={70} priority sx={{ display: { xs: "block", md: "none" } }} />
              </Stack>

              {formError ? <Alert severity="warning">{formError}</Alert> : null}

              <Stack spacing={0.5}>
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
                    htmlInput: { maxLength: 120 },
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
                  }}
                  disabled={loading}
                  error={Boolean(emailError)}
                  helperText={emailError ?? " "}
                  slotProps={{
                    htmlInput: { maxLength: 120 },
                    formHelperText: { sx: { mt: 0.5, minHeight: 18, textAlign: "right" } },
                  }}
                />
                <TextField
                  label="Пароль"
                  type="password"
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
                  helperText={passwordError ?? " "}
                  slotProps={{
                    htmlInput: { maxLength: 120 },
                    formHelperText: { sx: { mt: 0.5, minHeight: 18, textAlign: "right" } },
                  }}
                />
                {shouldConfirmPassword ? (
                  <TextField
                    label="Подтвердите пароль"
                    type="password"
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
                      htmlInput: { maxLength: 120 },
                      formHelperText: { sx: { mt: 0.5, minHeight: 18, textAlign: "right" } },
                    }}
                  />
                ) : null}
              </Stack>
            </Stack>

            {/* Desktop divider: с отступами сверху/снизу */}
            <Box
              aria-hidden
              sx={{
                display: { xs: "none", md: "flex", justifyContent: "center", alignItems: "center" },
                flexDirection: "column",
                height: "100%",
                position: "relative",
              }}
            >
              <Box sx={{ 
                width: "1px", 
                bgcolor: "primary.main", 
                flex: 1, 
                borderRadius: 1, 
                opacity: 0.3,
              }} />
              <LogoIcon size={70} priority />
              <Box sx={{ 
                width: "1px", 
                bgcolor: "primary.main", 
                flex: 1, 
                borderRadius: 1,
                opacity: 0.3,
              }} />
            </Box>

            <Stack spacing={2.5}>
              <CityAutocomplete
                label="Ваша локация"
                value={customerCity}
                onChange={(next) => {
                  setCustomerCity(next);
                  if (cityError) setCityError(null);
                }}
                disabled={loading}
                placeholder="Начните вводить (минимум 2 символа)"
                error={Boolean(cityError)}
                helperText={cityError ?? " "}
              />

              {versionsError ? <Alert severity="error">{versionsError}</Alert> : null}

              <FormControl error={Boolean(legalError)} variant="standard">
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
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Я принимаю{" "}
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
                      </Typography>
                    }
                    sx={{ alignItems: "flex-start", m: 0 }}
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
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Даю{" "}
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
                    sx={{ alignItems: "flex-start", m: 0 }}
                  />
                </Stack>
                <FormHelperText sx={{ mt: 0 }}>{legalError ?? " "}</FormHelperText>
              </FormControl>

              <Button
                variant="contained"
                size="large"
                fullWidth
                color="primary"
                type="submit"
                disabled={
                  loading ||
                  !termsPrivacyAccepted ||
                  !consentAccepted ||
                  !customerCity ||
                  !versionsReady ||
                  (shouldConfirmPassword && (confirmPassword.length === 0 || confirmPassword !== password))
                }
              >
                Создать аккаунт
              </Button>
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
              <Link href={signInHref} style={{ color: "inherit", fontWeight: 700, fontSize: 14, }}>
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
