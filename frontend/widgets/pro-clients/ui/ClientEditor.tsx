"use client";

import { useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import type { ProviderClient } from "@/entities/provider-client/model";
import { writeClientData } from "@/entities/provider-client/api";
import { normalizeContactEmailInput } from "@/shared/lib/contact-email";

type Props = {
  client?: ProviderClient;
  onCancel: () => void;
  onSave: (client: ProviderClient) => void;
};

export function ClientEditor({ client, onCancel, onSave }: Props) {
  const [email, setEmail] = useState(client?.email ?? "");
  const [name, setName] = useState(client?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const changedEmail = !!client && client.email !== email.trim().toLowerCase();
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const normalized = normalizeContactEmailInput(email);
    if (!normalized.email || normalized.error) {
      setError(normalized.error ?? "Введите email клиента");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const updated = await writeClientData<ProviderClient>(
        client ? `/api/pro/clients/${client.id}` : "/api/pro/clients",
        client ? "PATCH" : "POST",
        { email: normalized.email.toLowerCase(), name: name.trim() },
      );
      onSave(updated);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Не удалось сохранить клиента",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open onClose={() => !busy && onCancel()} fullWidth maxWidth="xs">
      <form onSubmit={submit}>
        <DialogTitle>
          {client ? "Редактировать клиента" : "Добавить клиента"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              required
              autoFocus
              type="email"
              label="Email клиента"
              size="small"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              slotProps={{
                input: { readOnly: client?.status === "CONNECTED" },
                htmlInput: { maxLength: 254 },
              }}
              helperText={
                client?.status === "CONNECTED"
                  ? "Почта подтверждена клиентом"
                  : undefined
              }
            />
            <TextField
              label="Имя клиента"
              size="small"
              value={name}
              disabled={busy}
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            {changedEmail && client.status === "INVITED" && (
              <Alert severity="warning">
                При сохранении старая ссылка приглашения перестанет действовать.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={onCancel}>
            Отмена
          </Button>
          <Button loading={busy} type="submit" variant="contained">
            {client ? "Сохранить" : "Добавить"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
