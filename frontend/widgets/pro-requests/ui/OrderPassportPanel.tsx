"use client";

import { useState } from "react";
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

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pro/requests/${orderId}/passport`, { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as PassportDto | { error?: string } | null;
      if (!res.ok) {
        setError(
          payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Не удалось получить паспорт"
        );
        setPassport(null);
        return;
      }
      setPassport(payload as PassportDto);
    } catch {
      setError("Не удалось получить паспорт");
      setPassport(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="outlined"
        onClick={() => {
          setOpen(true);
          void load();
        }}
        disabled={busy}
      >
        Паспорт клиента
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Паспорт клиента</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {!error && !passport ? (
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

