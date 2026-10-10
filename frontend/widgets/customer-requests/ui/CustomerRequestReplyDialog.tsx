"use client";

import { useEffect, useState } from "react";
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import type { RequestCustomerDto } from "@/entities/request";
import { replyToRequestProvider } from "../lib/reply-to-provider";

type Props = {
  item: RequestCustomerDto | null;
  onClose: () => void;
  onSendingChange?: (sending: boolean) => void;
  onSent: (item: RequestCustomerDto, body: string) => void;
};

export function CustomerRequestReplyDialog({ item, onClose, onSendingChange, onSent }: Props) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const providerName = item?.providerName?.trim() || null;

  useEffect(() => {
    setDraft("");
    setError(null);
  }, [item?.id]);

  async function send() {
    if (!item || sending) return;
    setSending(true);
    onSendingChange?.(true);
    setError(null);
    try {
      await replyToRequestProvider({
        requestId: item.id,
        providerId: item.providerId,
        subjectType: item.subjectType,
        body: draft,
      });
      onSent(item, draft);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось отправить ответ");
    } finally {
      setSending(false);
      onSendingChange?.(false);
    }
  }

  return (
    <Dialog
      open={item != null}
      onClose={() => {
        if (!sending) onClose();
      }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        Ответить исполнителю
        {providerName ? (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {providerName}
          </Typography>
        ) : null}
      </DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        ) : null}
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          label="Сообщение"
          value={draft}
          disabled={sending}
          onChange={(event) => setDraft(event.target.value)}
          sx={{ mt: 1.5 }}
        />
      </DialogContent>
      <DialogActions>
        <Button disabled={sending} onClick={onClose}>
          Отмена
        </Button>
        <Button variant="contained" disabled={sending || !draft.trim()} onClick={() => void send()}>
          {sending ? <CircularProgress size={18} color="inherit" aria-label="Отправка ответа" /> : "Отправить"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
