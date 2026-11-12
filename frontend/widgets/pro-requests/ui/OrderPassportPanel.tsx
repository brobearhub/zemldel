"use client";

import { useEffect, useRef, useState } from "react";
import { PASSPORT_ICON_COLOR, PassportIcon } from "@/shared/ui/PassportIcon";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import {
  ProRequestDocumentDownload,
  ProRequestDocumentFileCard,
} from "./ProRequestDocumentFileCard";

type PassportDto = {
  series: string;
  number: string;
  issuedBy: string | null;
  issuedAt: string | null;
  departmentCode: string | null;
  registrationAddress: string | null;
  fullName: string | null;
  birthDate: string | null;
};

export function OrderPassportPanel({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passport, setPassport] = useState<PassportDto | null>(null);

  const [photos, setPhotos] = useState<Array<{ id: string }>>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [denied, setDenied] = useState<Array<"FORM" | "PHOTO">>([]);
  const [pending, setPending] = useState<Array<"FORM" | "PHOTO">>([]);
  const [requesting, setRequesting] = useState<"FORM" | "PHOTO" | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    if (!open) return;
    const onChange = (event: Event) => {
      if ((event as CustomEvent<{ requestId: string }>).detail?.requestId === orderId)
        setAttempt((value) => value + 1);
    };
    const onSync = () => setAttempt((value) => value + 1);
    window.addEventListener("request:changed", onChange);
    window.addEventListener("request:sync", onSync);
    return () => {
      window.removeEventListener("request:changed", onChange);
      window.removeEventListener("request:sync", onSync);
    };
  }, [open, orderId]);

  useEffect(() => {
    setPassport(null);
    setPhotos([]);
    setError(null);
    setPhotoError(null);
    setDenied([]);
    setPending([]);
    setRequesting(null);
    setRequestError(null);
    generation.current += 1;
    if (!open) return;
    const controller = new AbortController();
    setBusy(true);
    const load = async (kind: "form" | "photo") => {
      try {
        const response = await fetch(`/api/pro/requests/${encodeURIComponent(orderId)}/passport${kind === "photo" ? "/photos" : ""}`, { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!controller.signal.aborted && response.status === 403)
          setDenied((current) => [...current, kind === "form" ? "FORM" : "PHOTO"]);
        if (!response.ok) throw new Error(response.status === 403 ? "Клиент не предоставил доступ или срок доступа истёк." : "Данные недоступны. Попробуйте обновить.");
        if (!controller.signal.aborted) {
          if (kind === "form") setPassport(body);
          else setPhotos(body);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          const message = error instanceof Error ? error.message : "Не удалось загрузить данные";
          if (kind === "form") setError(message);
          else setPhotoError(message);
        }
      }
    };
    const loadPending = async () => {
      try {
        const response = await fetch(`/api/pro/requests/${encodeURIComponent(orderId)}/passport/access-requests`, { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!controller.signal.aborted && response.ok && Array.isArray(body.pendingKinds)) setPending(body.pendingKinds);
      } catch { /* The POST is idempotent if the pending state could not be loaded. */ }
    };
    void Promise.all([load("form"), load("photo"), loadPending()]).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => { controller.abort(); generation.current += 1; };
  }, [open, orderId, attempt]);

  async function requestAccess(kind: "FORM" | "PHOTO") {
    if (requesting || busy || pending.includes(kind)) return;
    const scope = generation.current;
    setRequesting(kind);
    setRequestError(null);
    try {
      const response = await fetch(`/api/pro/requests/${encodeURIComponent(orderId)}/passport/access-requests/${kind}`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(typeof body.message === "string" ? body.message : "Не удалось отправить запрос. Попробуйте ещё раз.");
      if (generation.current !== scope) return;
      if (body.hasAccess) setAttempt((value) => value + 1);
      else setPending((current) => [...new Set([...current, kind])]);
    } catch (error) {
      if (generation.current === scope) setRequestError(error instanceof Error ? error.message : "Не удалось отправить запрос");
    } finally {
      if (generation.current === scope) setRequesting(null);
    }
  }

  const requestAction = (kind: "FORM" | "PHOTO") => denied.includes(kind) ? (
    <Button
      color="inherit"
      size="small"
      aria-label={`${pending.includes(kind) ? "Запрошены" : "Запросить"} ${kind === "FORM" ? "данные паспорта" : "фотографии паспорта"}`}
      disabled={busy || requesting !== null || pending.includes(kind)}
      loading={requesting === kind}
      onClick={() => void requestAccess(kind)}
      sx={{
        alignSelf: { xs: "flex-end", sm: "center" },
        flexShrink: 0,
        color: "text.primary",
        minHeight: 32,
        px: 1,
        py: 0.5,
        fontSize: "0.875rem",
        whiteSpace: "nowrap",
      }}
    >
      {pending.includes(kind) ? "Запрошено" : "Запросить"}
    </Button>
  ) : undefined;

  const accessNotice = (message: string, kind: "FORM" | "PHOTO") => (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      sx={{
        alignItems: "stretch",
      }}
    >
      <Alert
        severity="info"
        sx={{
          flex: 1,
        }}
      >
        {message}
      </Alert>
      {requestAction(kind)}
    </Stack>
  );

  function close() {
    setOpen(false);
    setPassport(null);
    setPhotos([]);
  }

  return (
    <>
      <Button
        variant="outlined"
        color="secondary"
        startIcon={<PassportIcon sx={{ color: PASSPORT_ICON_COLOR }} />}
        onClick={() => {
          setOpen(true);
        }}
        loading={busy}
      >
        Паспорт клиента
      </Button>

      <Dialog
        open={open}
        onClose={close}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Паспорт клиента</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography variant="subtitle1">Данные паспорта</Typography>
            {error ? accessNotice(error, "FORM") : null}
            {busy && !error && !passport ? (
              <Typography sx={{
                color: "text.secondary"
              }}>Загрузка...</Typography>
            ) : null}

            {passport ? (
              <>
                <Typography>
                  <b>Серия/номер:</b> {passport.series} {passport.number}
                </Typography>
                <Divider />
                <Typography>
                  <b>ФИО:</b> {passport.fullName ?? "—"}
                </Typography>
                <Typography>
                  <b>Дата рождения:</b> {passport.birthDate ?? "—"}
                </Typography>
                <Typography>
                  <b>Кем выдан:</b> {passport.issuedBy ?? "—"}
                </Typography>
                <Typography>
                  <b>Дата выдачи:</b> {passport.issuedAt ?? "—"}
                </Typography>
                <Typography>
                  <b>Код подразделения:</b> {passport.departmentCode ?? "—"}
                </Typography>
                <Typography>
                  <b>Адрес регистрации:</b> {passport.registrationAddress ?? "—"}
                </Typography>
              </>
            ) : null}
            <Divider />
            <Typography variant="subtitle1">Фотографии паспорта</Typography>
            {photoError ? accessNotice(photoError, "PHOTO") : null}
            {requestError ? <Alert severity="error">{requestError}</Alert> : null}
            {!busy && !photoError && photos.length === 0 ? <Typography>Фотографии не сохранены.</Typography> : null}
            {photos.map((photo, index) => (
              <ProRequestDocumentFileCard
                key={photo.id}
                title={`Фото паспорта ${index + 1}`}
                actions={
                  <ProRequestDocumentDownload
                    href={`/api/pro/requests/${encodeURIComponent(orderId)}/passport/photos/${encodeURIComponent(photo.id)}`}
                    name={`фото паспорта ${index + 1}`}
                    disabled={busy}
                  />
                }
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setAttempt((value) => value + 1)}
            disabled={busy}
            sx={{
              color: "text.primary",
            }}
          >
            Обновить
          </Button>
          <Button
            onClick={close}
            sx={{
              color: "text.primary",
            }}
          >
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

