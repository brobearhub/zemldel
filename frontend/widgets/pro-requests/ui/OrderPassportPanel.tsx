"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

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

  useEffect(() => {
    setPassport(null);
    setPhotos([]);
    setError(null);
    setPhotoError(null);
    if (!open) return;
    const controller = new AbortController();
    setBusy(true);
    const load = async (kind: "form" | "photo") => {
      try {
        const response = await fetch(`/api/pro/requests/${encodeURIComponent(orderId)}/passport${kind === "photo" ? "/photos" : ""}`, { cache: "no-store", signal: controller.signal });
        const body = await response.json();
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
    void Promise.all([load("form"), load("photo")]).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [open, orderId, attempt]);

  function close() {
    setOpen(false);
    setPassport(null);
    setPhotos([]);
  }

  return (
    <>
      <Button
        variant="outlined"
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
            <Typography variant="subtitle1">Анкета</Typography>
            {error ? <Alert severity="info">{error}</Alert> : null}
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
            <Typography variant="subtitle1">Фотографии</Typography>
            {photoError ? <Alert severity="info">{photoError}</Alert> : null}
            {!busy && !photoError && photos.length === 0 ? <Typography>Фотографии не сохранены.</Typography> : null}
            {photos.map((photo, index) => (
              <Box
                key={photo.id}
                component="img"
                src={`/api/pro/requests/${encodeURIComponent(orderId)}/passport/photos/${encodeURIComponent(photo.id)}?view=${attempt}`}
                alt={`Фото паспорта ${index + 1}`}
                onError={() => { setPhotos([]); setPhotoError("Доступ к фотографиям закрыт или хранилище недоступно."); }}
                sx={{
                  width: "100%",
                  maxHeight: 500,
                  objectFit: "contain",
                }}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setAttempt((value) => value + 1)}
            disabled={busy}
          >Обновить</Button>
          <Button onClick={close}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

