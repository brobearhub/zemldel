"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Link, Stack, Typography } from "@mui/material";
import type { RequestCustomerDto } from "@/entities/request";
import { passportAccessError, passportAccessUrl, passportKindLabel, type PassportAccessState } from "../model/passport-access";

const actions: Record<string, string> = {
  GRANT_FORM: "Предоставлен доступ к анкете",
  GRANT_PHOTO: "Предоставлен доступ к фотографиям",
  REVOKE_FORM: "Отозван доступ к анкете",
  REVOKE_PHOTO: "Отозван доступ к фотографиям",
  REQUEST_REVOKE_FORM: "Доступ к анкете закрыт из-за изменения заявки",
  REQUEST_REVOKE_PHOTO: "Доступ к фотографиям закрыт из-за изменения заявки",
  PROVIDER_FORM_READ: "Исполнитель просмотрел анкету",
  PROVIDER_PHOTO_READ: "Исполнитель просмотрел фотографию",
  PROVIDER_READ: "Исполнитель просмотрел анкету по прежним правилам",
};

export function PassportAccessPanel({ refreshKey, requests }: { refreshKey: string; requests: RequestCustomerDto[] }) {
  const [state, setState] = useState<PassportAccessState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
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

  return (
    <Stack
      component="section"
      spacing={2}
      aria-label="Доступ к паспорту"
    >
      <Typography variant="h6">Доступ исполнителей к паспорту</Typography>
      <Button
        onClick={() => setAttempt((value) => value + 1)}
        disabled={busy !== null}
        sx={{ alignSelf: "flex-start" }}
      >
        Обновить журнал
      </Button>
      {error ? <Alert severity="error">{error}<Button onClick={() => setAttempt((value) => value + 1)}>Повторить</Button></Alert> : null}
      {!state && !error ? <Typography>Загрузка разрешений…</Typography> : null}
      {state?.grants.length === 0 ? <Typography>Разрешений пока нет. Выдайте доступ кнопкой «Поделиться» у анкеты или фотографий.</Typography> : null}
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
      {state?.audit.length ? (
        <Stack spacing={1}>
          <Typography variant="subtitle1">Журнал доступа · последние 50 событий</Typography>
          {state.audit.map((event) => {
            const request = requests.find((request) => request.id === event.requestId);
            const providerName = state.grants.find((grant) => grant.providerId === event.actorProviderId)?.providerName ?? (request?.providerId === event.actorProviderId ? request.providerName : null);
            return (
              <Typography
                key={event.id}
                variant="body2"
              >
                {new Date(event.createdAt).toLocaleString("ru-RU")} · {actions[event.action] ?? event.action}
                {providerName ? ` · ${providerName}` : event.actorProviderId ? ` · Исполнитель ${event.actorProviderId.slice(0, 8)}` : ""}
                {event.requestId ? <> · <Link href={`/profile/requests/${event.requestId}`}>{request?.serviceTitle || request?.categoryName || "Заявка"}</Link></> : null}
              </Typography>
            );
          })}
        </Stack>
      ) : null}
    </Stack>
  );
}
