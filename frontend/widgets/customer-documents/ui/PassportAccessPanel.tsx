"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Link, Stack, Typography } from "@mui/material";
import { formatRequestCreatedAt, formatRequestReference, type RequestCustomerDto } from "@/entities/request";
import { PASSPORT_REQUESTS_CHANGED, passportAccessError, passportAccessUrl, passportKindLabel, refreshPassportRequests, type PassportAccessRequest, type PassportAccessState } from "../model/passport-access";

export function PassportAccessPanel({ refreshKey, requests, onShare }: { refreshKey: string; requests: RequestCustomerDto[]; onShare?: (request: PassportAccessRequest) => void }) {
  const [state, setState] = useState<PassportAccessState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "hidden") setAttempt((value) => value + 1);
    };
    const events = [PASSPORT_REQUESTS_CHANGED, "request:changed", "request:sync", "focus", "online"];
    for (const event of events) window.addEventListener(event, refresh);
    document.addEventListener("visibilitychange", refresh);
    const timer = setInterval(refresh, 60_000);
    return () => {
      clearInterval(timer);
      for (const event of events) window.removeEventListener(event, refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    void fetch(passportAccessUrl, { cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Не удалось загрузить разрешения");
      const data = await response.json();
      if (!controller.signal.aborted) setState(data);
    }).catch(() => { if (!controller.signal.aborted) setError("Не удалось загрузить разрешения"); });
    return () => controller.abort();
  }, [refreshKey, attempt]);

  async function revoke(requestId: string, kind: "FORM" | "PHOTO") {
    setBusy(`${requestId}-${kind}`);
    setError(null);
    try {
      const response = await fetch(`${passportAccessUrl}/${encodeURIComponent(requestId)}/${kind}`, { method: "DELETE" });
      if (!response.ok) throw new Error(passportAccessError(await response.json(), "Не удалось отозвать доступ"));
      setState((current) => current ? { ...current, grants: current.grants.filter((grant) => grant.requestId !== requestId || grant.kind !== kind) } : current);
      setAttempt((value) => value + 1);
    } catch (error) { setError(error instanceof Error ? error.message : "Не удалось отозвать доступ"); }
    finally { setBusy(null); }
  }

  async function decline(request: PassportAccessRequest) {
    setBusy(`${request.requestId}-${request.kind}`);
    setError(null);
    try {
      const response = await fetch(`${passportAccessUrl}/requests/${encodeURIComponent(request.requestId)}/${request.kind}`, { method: "DELETE" });
      if (!response.ok) throw new Error(passportAccessError(await response.json(), "Не удалось отклонить запрос"));
      setState((current) => current ? {
        ...current,
        requests: current.requests?.filter((pending) => pending.requestId !== request.requestId || pending.kind !== request.kind),
      } : current);
      refreshPassportRequests();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось отклонить запрос");
    } finally { setBusy(null); }
  }

  return (
    <Stack
      component="section"
      id="passport-access"
      spacing={2}
      aria-label="Доступ к паспорту"
      sx={{
        scrollMarginTop: 100,
      }}
    >
      <Typography variant="h6">Доступ исполнителей к паспорту</Typography>
      {state?.requests?.length ? (
        <Stack
          spacing={1.5}
          aria-label="Запросы исполнителей"
        >
          <Typography
            variant="subtitle1"
          >
            Ожидают вашего решения
          </Typography>
          {state.requests.map((pending) => {
            const available = pending.kind === "FORM" ? state.hasForm : state.photoCount > 0;
            return (
              <Stack
                key={`${pending.requestId}-${pending.kind}`}
                spacing={1}
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 600,
                  }}
                >
                  {pending.providerName}
                </Typography>
                <Typography>Запрашивает: {passportKindLabel(pending.kind).toLowerCase()}</Typography>
                <Link href={`/profile/requests/${pending.requestId}`}>{pending.requestTitle}</Link>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                  }}
                >
                  {formatRequestReference({ id: pending.requestId, number: pending.requestNumber })}
                  {" · Запрошено "}{formatRequestCreatedAt(pending.createdAt)}
                </Typography>
                {!available ? (
                  <Typography
                    variant="body2"
                    sx={{
                      color: "info.main",
                    }}
                  >
                    {pending.kind === "FORM" ? "Сначала заполните данные паспорта в блоке выше." : "Сначала загрузите фотографии паспорта в блоке выше."}
                  </Typography>
                ) : null}
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                >
                  <Button
                    variant="outlined"
                    color="secondary"
                    disabled={busy !== null || !available}
                    onClick={() => onShare?.(pending)}
                  >
                    Предоставить доступ
                  </Button>
                  <Button
                    color="error"
                    disabled={busy !== null}
                    onClick={() => void decline(pending)}
                  >
                    Отклонить
                  </Button>
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      ) : null}
      <Button
        onClick={() => setAttempt((value) => value + 1)}
        disabled={busy !== null}
        sx={{
          alignSelf: "flex-start",
          color: "text.primary",
        }}
      >
        Обновить разрешения
      </Button>
      {error ? <Alert severity="error">{error}<Button onClick={() => setAttempt((value) => value + 1)}>Повторить</Button></Alert> : null}
      {!state && !error ? <Typography>Загрузка разрешений…</Typography> : null}
      {state?.grants.length === 0 ? <Typography>Разрешений пока нет. Выдайте доступ кнопкой «Поделиться» у данных или фотографий паспорта.</Typography> : null}
      {state?.grants.map((grant) => (
        <Stack
          key={`${grant.requestId}-${grant.kind}`}
          spacing={0.5}
          sx={{
            p: 2,
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
          }}
        >
          <Typography>{passportKindLabel(grant.kind)} · {grant.providerName}</Typography>
          <Link href={`/profile/requests/${grant.requestId}`}>{grant.requestTitle}</Link>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary" }}
          >
            {formatRequestReference({
              id: grant.requestId,
              number: requests.find((request) => request.id === grant.requestId)?.number,
              createdAt: requests.find((request) => request.id === grant.requestId)?.createdAt,
            })}
          </Typography>
          <Typography variant="body2">
            {grant.active && new Date(grant.expiresAt) > new Date() ? "Доступ до" : "Срок доступа истёк / доступ закрыт"} {new Date(grant.expiresAt).toLocaleString("ru-RU")}
          </Typography>
          <Button
            onClick={() => void revoke(grant.requestId, grant.kind)}
            disabled={busy !== null}
            sx={{ alignSelf: "flex-start" }}
          >
            Отозвать доступ: {passportKindLabel(grant.kind).toLowerCase()}
          </Button>
        </Stack>
      ))}
    </Stack>
  );
}
