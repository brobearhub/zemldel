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
import { type FormEvent, useState } from "react";
import { REQUEST_INTENT as SERVICE_REQUEST_INTENT } from "@/entities/request";
import type { CitySuggestItemDto } from "@/entities/city";
import { CityAutocomplete } from "@/shared/ui/CityAutocomplete";
import { Markdown } from "@/shared/ui/Markdown";

type LegalDoc = "offer" | "privacy";

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
  const [customerCity, setCustomerCity] = useState<CitySuggestItemDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cityError, setCityError] = useState<string | null>(null);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [legalError, setLegalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [legalDocOpen, setLegalDocOpen] = useState<LegalDoc | null>(null);
  const [offerBusy, setOfferBusy] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerVersion, setOfferVersion] = useState<string | null>(null);
  const [offerMarkdown, setOfferMarkdown] = useState<string | null>(null);
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [privacyVersion, setPrivacyVersion] = useState<string | null>(null);
  const [privacyMarkdown, setPrivacyMarkdown] = useState<string | null>(null);

  const intent = searchParams.get("intent");
  const returnTo = searchParams.get("returnTo");
  const signInHref = searchParams.toString() ? `/signin?${searchParams.toString()}` : "/signin";

  async function openLegalDoc(doc: LegalDoc) {
    setLegalDocOpen(doc);

    if (doc === "offer") {
      if (offerBusy || offerMarkdown) return;
      setOfferBusy(true);
      setOfferError(null);
      try {
        const res = await fetch("/api/public-offer/current", { cache: "no-store" });
        const payload = (await res.json().catch(() => null)) as
          | { error?: string }
          | { version: string; markdown: string }
          | null;
        if (!res.ok) {
          throw new Error(
            payload && typeof payload === "object" && "error" in payload
              ? payload.error ?? "Не удалось загрузить оферту"
              : "Не удалось загрузить оферту",
          );
        }
        const data = payload as { version: string; markdown: string };
        setOfferVersion(data.version);
        setOfferMarkdown(data.markdown);
      } catch (e) {
        setOfferError(e instanceof Error ? e.message : "Не удалось загрузить оферту");
      } finally {
        setOfferBusy(false);
      }
      return;
    }

    if (doc === "privacy") {
      if (privacyBusy || privacyMarkdown) return;
      setPrivacyBusy(true);
      setPrivacyError(null);
      try {
        const res = await fetch("/api/privacy-policy/current", { cache: "no-store" });
        const payload = (await res.json().catch(() => null)) as
          | { error?: string }
          | { version: string; markdown: string }
          | null;
        if (!res.ok) {
          throw new Error(
            payload && typeof payload === "object" && "error" in payload
              ? payload.error ?? "Не удалось загрузить политику конфиденциальности"
              : "Не удалось загрузить политику конфиденциальности",
          );
        }
        const data = payload as { version: string; markdown: string };
        setPrivacyVersion(data.version);
        setPrivacyMarkdown(data.markdown);
      } catch (e) {
        setPrivacyError(
          e instanceof Error ? e.message : "Не удалось загрузить политику конфиденциальности",
        );
      } finally {
        setPrivacyBusy(false);
      }
    }
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setCityError(null);
    setLegalError(null);

    if (!legalAccepted) {
      setLegalError("Чтобы продолжить, нужно принять оферту и политику конфиденциальности");
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
        body: JSON.stringify({ name, email, password, customerCityId: customerCity.id }),
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
          : "/welcome";

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
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void openLegalDoc("offer");
                        }}
                        style={{ color: "inherit", fontWeight: 700, textDecoration: "underline" }}
                      >
                        оферту
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
                disabled={loading || !legalAccepted || !customerCity}
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

      <Dialog
        open={Boolean(legalDocOpen)}
        onClose={() => setLegalDocOpen(null)}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle>
          {legalDocOpen === "offer" ? "Публичная оферта" : legalDocOpen === "privacy" ? "Политика конфиденциальности" : ""}
        </DialogTitle>
        <DialogContent dividers>
          {legalDocOpen === "offer" ? (
            <Stack spacing={1.5}>
              {offerVersion ? (
                <Typography variant="body2" color="text.secondary">
                  Версия: {offerVersion}
                </Typography>
              ) : null}
              {offerError ? <Alert severity="error">{offerError}</Alert> : null}
              {offerBusy ? <Typography color="text.secondary">Загрузка…</Typography> : null}
              {!offerBusy && offerMarkdown ? (
                <Markdown markdown={offerMarkdown} skipFirstH1 />
              ) : null}
            </Stack>
          ) : null}

          {legalDocOpen === "privacy" ? (
            <Stack spacing={1.5}>
              {privacyVersion ? (
                <Typography variant="body2" color="text.secondary">
                  Версия: {privacyVersion}
                </Typography>
              ) : null}
              {privacyError ? <Alert severity="error">{privacyError}</Alert> : null}
              {privacyBusy ? <Typography color="text.secondary">Загрузка…</Typography> : null}
              {!privacyBusy && privacyMarkdown ? (
                <Markdown markdown={privacyMarkdown} skipFirstH1 />
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLegalDocOpen(null)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

