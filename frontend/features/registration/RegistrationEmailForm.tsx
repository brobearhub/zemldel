"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import type { AccountKind } from "@/core/auth/authorization";
import { INVALID_CONTACT_EMAIL_MESSAGE, normalizeContactEmailInput } from "@/shared/lib/contact-email";
import {
  clearRegistrationProgress,
  saveRegistrationProgress,
  type RegistrationProgress,
} from "./registration-progress";

type Props = {
  mode?: "signup" | "signin";
  disabled?: boolean;
  onPasswordRequired: (email: string) => void;
  accountKind: AccountKind | null;
  initialEmail: string;
  fixedEmail?: string;
  challenge: Extract<RegistrationProgress, { stage: "code" }> | null;
  notice: string | null;
  onChange: (progress: RegistrationProgress | null) => void;
};

export function RegistrationEmailForm({
  mode = "signup",
  disabled = false,
  accountKind,
  initialEmail,
  fixedEmail,
  challenge,
  notice,
  onChange,
  onPasswordRequired,
}: Props) {
  const [enteredEmail, setEmail] = useState<string | null>(null);
  const email = fixedEmail ?? enteredEmail ?? initialEmail;
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"send" | "verify" | null>(null);
  const blocked = disabled || Boolean(busy);
  const mounted = useRef(true);
  const codeRef = useRef<HTMLInputElement>(null);
  const resendAt = challenge ? Date.parse(challenge.resendAt) : 0;
  const [now, setNow] = useState(() => Date.now());
  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const start = Date.now();
    setNow(start);
    if (resendAt <= start) return;
    const interval = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= resendAt) window.clearInterval(interval);
    }, 500);
    return () => window.clearInterval(interval);
  }, [resendAt]);

  async function sendCode(submittedEmail?: string) {
    if (blocked || (challenge && secondsLeft > 0)) return;
    const address = normalizeContactEmailInput(fixedEmail ?? challenge?.email ?? submittedEmail ?? email).email?.toLowerCase();
    if (!address) {
      setError(INVALID_CONTACT_EMAIL_MESSAGE);
      return;
    }
    setError(null);
    setBusy("send");
    try {
      const response = await fetch(mode === "signin" ? "/api/auth/signin/email" : "/api/auth/signup/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "signin" ? { email: address } : { email: address, accountKind: accountKind ?? challenge?.accountKind ?? undefined }),
      });
      const data = await response.json();
      if (!mounted.current) return;
      if (!response.ok) {
        setError(response.status === 409 ? "Этот email уже зарегистрирован. Войдите в свой аккаунт." :
          data.error ?? data.message ?? "Не удалось отправить код. Попробуйте ещё раз.");
        return;
      }
      if (data.status === "password_required") {
        clearRegistrationProgress();
        onPasswordRequired(address);
        return;
      }
      if (data.status !== "verification_required" || typeof data.resendAt !== "string" || !Number.isFinite(Date.parse(data.resendAt))) {
        setError("Не удалось получить код. Попробуйте ещё раз.");
        return;
      }
      setCode("");
      setNow(Date.now());
      const next: RegistrationProgress = {
        stage: "code",
        email: address,
        accountKind: data.accountKind ?? accountKind,
        resendAt: data.resendAt,
        codeUnavailable: data.codeUnavailable === true || undefined,
      };
      if (mode === "signup") saveRegistrationProgress(next);
      onChange(next);
      codeRef.current?.focus();
    } catch {
      setError("Не удалось отправить код. Попробуйте ещё раз.");
    } finally {
      setBusy(null);
    }
  }

  async function verifyCode(submittedCode: string) {
    if (!challenge || challenge.codeUnavailable || blocked) return;
    if (!/^\d{4}$/.test(submittedCode)) {
      setError("Введите четыре цифры из письма");
      codeRef.current?.focus();
      return;
    }
    setError(null);
    setBusy("verify");
    try {
      const response = await fetch("/api/auth/signup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: challenge.email, code: submittedCode }),
      });
      const data = await response.json();
      if (!mounted.current) return;
      if (!response.ok) {
        setError(data.error ?? data.message ?? "Не удалось подтвердить код");
        return;
      }
      if (data.status === "password_required") {
        clearRegistrationProgress();
        onPasswordRequired(challenge.email);
        return;
      }
      if (data.status !== "registration_required") {
        setError("Не удалось подтвердить email. Попробуйте ещё раз.");
        return;
      }
      const next: RegistrationProgress = {
        stage: "verified",
        email: challenge.email,
        accountKind: data.accountKind ?? challenge.accountKind,
      };
      saveRegistrationProgress(next);
      onChange(next);
    } catch {
      setError("Не удалось проверить код. Попробуйте ещё раз.");
    } finally {
      setBusy(null);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Autofill and input typed during hydration may update the field before React state.
    const fields = new FormData(event.currentTarget);
    if (challenge) void verifyCode(String(fields.get("code") ?? ""));
    else void sendCode(String(fields.get("email") ?? ""));
  }

  function changeEmail() {
    if (challenge) setEmail(challenge.email);
    setError(null);
    setCode("");
    clearRegistrationProgress();
    onChange(null);
  }

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <Stack spacing={2.5}>
        {notice && !challenge ? <Alert severity="info">{notice}</Alert> : null}
        {challenge ? (
          <>
            <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
              {challenge.codeUnavailable ? "Чтобы продолжить, запросите новый код для" : "Введите код из письма, отправленного на"}{" "}
              <strong>{challenge.email}</strong>.
            </Typography>
            <TextField
              key="code"
              label="Код из письма"
              name="code"
              autoComplete="one-time-code"
              autoFocus
              fullWidth
              size="small"
              inputRef={codeRef}
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 4));
                setError(null);
              }}
              disabled={blocked || challenge.codeUnavailable}
              error={Boolean(error)}
              helperText={error ?? "4 цифры"}
              slotProps={{
                htmlInput: { inputMode: "numeric", pattern: "[0-9]{4}", maxLength: 4 },
                formHelperText: { role: error ? "alert" : undefined },
              }}
            />
            <Button variant="contained" size="large" type="submit" loading={busy === "verify"} disabled={disabled || busy === "send" || challenge.codeUnavailable}>
              Подтвердить email
            </Button>
            <Stack spacing={0.5}>
              <Button
                type="button"
                variant="outlined"
                loading={busy === "send"}
                disabled={blocked || secondsLeft > 0}
                onClick={() => void sendCode()}
              >
                {secondsLeft > 0 ? `Отправить новый код через ${secondsLeft} с` : "Отправить новый код"}
              </Button>
              {!fixedEmail && <Button type="button" color="inherit" disabled={blocked} onClick={changeEmail}>
                Изменить email
              </Button>}
            </Stack>
          </>
        ) : (
          <>
            <TextField
              key="email"
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              autoCapitalize="none"
              fullWidth
              size="small"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              disabled={blocked}
              error={Boolean(error)}
              helperText={error ?? (mode === "signin" ? " " : "Отправим код подтверждения на эту почту")}
              slotProps={{
                htmlInput: { maxLength: 254, readOnly: Boolean(fixedEmail) },
                formHelperText: { role: error ? "alert" : undefined },
              }}
            />
            <Button variant="contained" size="large" type="submit" loading={busy === "send"} disabled={disabled}>
              {mode === "signin" ? "Продолжить" : "Получить код"}
            </Button>
          </>
        )}
      </Stack>
    </Box>
  );
}
