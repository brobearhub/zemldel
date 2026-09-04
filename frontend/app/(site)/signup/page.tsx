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
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { REQUEST_INTENT as SERVICE_REQUEST_INTENT } from "@/entities/request";
import type { CitySuggestItemDto } from "@/entities/city";
import { CityAutocomplete } from "@/shared/ui/CityAutocomplete";
import { Markdown } from "@/shared/ui/Markdown";

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
  minHeight: "100dvh",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  px: 2,
  backgroundImage: "url('/hero-bg-house_static.jpg')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
} as const;

function SignUpPageFallback() {
  return (
    <Box sx={signUpShellSx}>
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
  const [customerCity, setCustomerCity] = useState<CitySuggestItemDto | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    setCityError(null);
    setLegalError(null);

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
        const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        setError(data.error ?? data.message ?? "Не удалось зарегистрироваться");
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
      setError("Не удалось зарегистрироваться. Попробуйте ещё раз.");
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
          <Typography
            variant="h4"
            component="h1"
            align="center"
            sx={{
              fontWeight: 700,
              color: "text.secondary"
            }}>
            Регистрация
          </Typography>
          <Typography variant="body2" align="center" sx={{
            color: "text.secondary"
          }}>
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
                      <Typography variant="body2" sx={{
                        color: "text.secondary"
                      }}>
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
                      <Typography variant="body2" sx={{
                        color: "text.secondary"
                      }}>
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
                color="secondary"
                type="submit"
                disabled={
                  loading ||
                  !termsPrivacyAccepted ||
                  !consentAccepted ||
                  !customerCity ||
                  !versionsReady
                }
              >
                Создать аккаунт
              </Button>
            </Stack>
          </Box>

          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Уже есть аккаунт?{" "}
            <Link href={signInHref} style={{ color: "inherit", fontWeight: 600 }}>
              Войти
            </Link>
          </Typography>
        </Stack>
      </Paper>

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
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                Версия: {openDoc.version}
              </Typography>
            ) : null}
            {openDoc?.error ? <Alert severity="error">{openDoc.error}</Alert> : null}
            {openDoc?.busy ? <Typography sx={{
              color: "text.secondary"
            }}>Загрузка…</Typography> : null}
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
