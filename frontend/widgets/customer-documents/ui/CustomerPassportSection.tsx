"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";

type PassportDto = {
  series: string;
  number: string;
  issuedBy: string | null;
  issuedAt: string | null; // YYYY-MM-DD
  departmentCode: string | null;
  registrationAddress: string | null;
  fullName: string | null;
  birthDate: string | null; // YYYY-MM-DD
};

const EMPTY: PassportDto = {
  series: "",
  number: "",
  issuedBy: null,
  issuedAt: null,
  departmentCode: null,
  registrationAddress: null,
  fullName: null,
  birthDate: null,
};

export function CustomerPassportSection() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [value, setValue] = useState<PassportDto>(EMPTY);
  const [hasExisting, setHasExisting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/documents/passport", { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as
        | PassportDto
        | { error?: string; code?: string }
        | null;
      if (!res.ok) {
        setError(
          payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Не удалось загрузить паспорт"
        );
        return;
      }
      if (!payload) {
        setValue(EMPTY);
        setHasExisting(false);
        return;
      }
      setValue(payload as PassportDto);
      setHasExisting(true);
    } catch {
      setError("Не удалось загрузить паспорт");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setField<K extends keyof PassportDto>(key: K) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value;
      setValue((prev) => ({
        ...prev,
        [key]: next.length ? next : null,
      }));
      setNotice(null);
      setError(null);
    };
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/documents/passport", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...value,
          series: (value.series ?? "").toString(),
          number: (value.number ?? "").toString(),
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string; code?: string } | { ok?: boolean } | null;
      if (!res.ok) {
        setError(
          payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Не удалось сохранить паспорт"
        );
        return;
      }
      setHasExisting(true);
      setNotice("Паспорт сохранён");
    } catch {
      setError("Не удалось сохранить паспорт");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!hasExisting) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/documents/passport", { method: "DELETE" });
      const payload = (await res.json().catch(() => null)) as { error?: string; code?: string } | null;
      if (!res.ok) {
        setError(
          payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Не удалось удалить паспорт"
        );
        return;
      }
      setValue(EMPTY);
      setHasExisting(false);
      setNotice("Паспорт удалён");
    } catch {
      setError("Не удалось удалить паспорт");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={3} component="section">
      <Box>
        <Typography variant="h4" gutterBottom sx={{
          fontWeight: 800
        }}>
          Документы
        </Typography>
        <Typography sx={{
          color: "text.secondary"
        }}>Паспорт хранится в зашифрованном виде и доступен только вам.</Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={2} component="form" onSubmit={handleSave}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {notice ? <Alert severity="success">{notice}</Alert> : null}

          <Typography variant="h6" sx={{
            fontWeight: 800
          }}>
            Паспорт
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              label="Серия"
              value={value.series ?? ""}
              onChange={setField("series")}
              disabled={busy || loading}
              slotProps={{ htmlInput: { inputMode: "numeric" } }}
              placeholder="1234"
              fullWidth
              required
            />
            <TextField
              label="Номер"
              value={value.number ?? ""}
              onChange={setField("number")}
              disabled={busy || loading}
              slotProps={{ htmlInput: { inputMode: "numeric" } }}
              placeholder="123456"
              fullWidth
              required
            />
          </Stack>

          <TextField
            label="ФИО"
            value={value.fullName ?? ""}
            onChange={setField("fullName")}
            disabled={busy || loading}
            fullWidth
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              label="Дата рождения"
              value={value.birthDate ?? ""}
              onChange={setField("birthDate")}
              disabled={busy || loading}
              placeholder="YYYY-MM-DD"
              fullWidth
            />
            <TextField
              label="Дата выдачи"
              value={value.issuedAt ?? ""}
              onChange={setField("issuedAt")}
              disabled={busy || loading}
              placeholder="YYYY-MM-DD"
              fullWidth
            />
          </Stack>

          <TextField
            label="Кем выдан"
            value={value.issuedBy ?? ""}
            onChange={setField("issuedBy")}
            disabled={busy || loading}
            fullWidth
          />

          <TextField
            label="Код подразделения"
            value={value.departmentCode ?? ""}
            onChange={setField("departmentCode")}
            disabled={busy || loading}
            placeholder="000-000"
            fullWidth
          />

          <TextField
            label="Адрес регистрации"
            value={value.registrationAddress ?? ""}
            onChange={setField("registrationAddress")}
            disabled={busy || loading}
            fullWidth
            multiline
            minRows={2}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button type="submit" variant="contained" disabled={busy || loading}>
              {hasExisting ? "Сохранить" : "Сохранить паспорт"}
            </Button>
            <Button variant="outlined" disabled={busy} onClick={() => void load()}>
              Обновить
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button variant="outlined" color="error" disabled={busy || !hasExisting} onClick={() => void handleDelete()}>
              Удалить
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}

