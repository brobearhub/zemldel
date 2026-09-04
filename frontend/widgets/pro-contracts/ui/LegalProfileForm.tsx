"use client";

import { useState } from "react";
import { Alert, Button, Paper, Stack, TextField, Typography } from "@mui/material";

type Field = {
  name: string;
  label: string;
};

type Props = {
  title: string;
  endpoint: string;
  fields: Field[];
  initial: Record<string, unknown>;
};

export function LegalProfileForm({ title, endpoint, fields, initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.name, typeof initial[field.name] === "string" ? initial[field.name] as string : ""])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(payload?.error ?? "Не удалось сохранить реквизиты");
      setNotice("Реквизиты сохранены");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось сохранить реквизиты");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <Typography variant="h5" sx={{
          fontWeight: 800
        }}>{title}</Typography>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {notice ? <Alert severity="success">{notice}</Alert> : null}
        <Stack spacing={1.5}>
          {fields.map((field) => (
            <TextField
              key={field.name}
              label={field.label}
              value={values[field.name] ?? ""}
              onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
              disabled={busy}
              fullWidth
            />
          ))}
        </Stack>
        <Button variant="contained" disabled={busy} onClick={() => void save()}>Сохранить реквизиты</Button>
      </Stack>
    </Paper>
  );
}
