"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

type ContractFileStatus = "PENDING_CUSTOMER" | "APPROVED" | "REVISION_REQUESTED";
export type CustomerContractFileListItem = {
  id: string;
  status: ContractFileStatus;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  revisionMessage: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function statusLabel(status: ContractFileStatus) {
  if (status === "APPROVED") return "Одобрен";
  if (status === "REVISION_REQUESTED") return "На доработку";
  return "Ожидает решения";
}

export function CustomerRequestContractFilesClient({
  requestId,
  initialFiles,
}: {
  requestId: string;
  initialFiles: CustomerContractFileListItem[];
}) {
  const [files, setFiles] = useState(initialFiles);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionFileId, setRevisionFileId] = useState<string | null>(null);
  const [revisionMessage, setRevisionMessage] = useState("");

  const hasApproved = useMemo(() => files.some((f) => f.status === "APPROVED"), [files]);

  async function refresh() {
    const res = await fetch(`/api/requests/${requestId}/contract-files`, { cache: "no-store" });
    const payload = (await res.json().catch(() => null)) as CustomerContractFileListItem[] | { error?: string } | null;
    if (res.ok && Array.isArray(payload)) setFiles(payload);
  }

  async function approve(fileId: string) {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${requestId}/contract-files/${fileId}/approve`, { method: "POST" });
      const payload = (await res.json().catch(() => null)) as { error?: string } | { ok?: boolean } | null;
      if (!res.ok) throw new Error(payload && typeof payload === "object" && "error" in payload ? payload.error ?? "Не удалось одобрить" : "Не удалось одобрить");
      await refresh();
      setNotice("Договор одобрен.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось одобрить");
    } finally {
      setBusy(false);
    }
  }

  async function submitRevision() {
    if (!revisionFileId) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${requestId}/contract-files/${revisionFileId}/revision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: revisionMessage }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | { ok?: boolean } | null;
      if (!res.ok) throw new Error(payload && typeof payload === "object" && "error" in payload ? payload.error ?? "Не удалось отправить на доработку" : "Не удалось отправить на доработку");
      setRevisionOpen(false);
      setRevisionFileId(null);
      setRevisionMessage("");
      await refresh();
      setNotice("Запрос на доработку отправлен компании.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить на доработку");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2}>
      {notice ? <Alert severity="success">{notice}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      {files.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Typography color="text.secondary">Компания ещё не прикрепила договор.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {files.map((f) => (
            <Paper key={f.id} variant="outlined" sx={{ p: 2.5 }}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography fontWeight={800} sx={{ wordBreak: "break-word" }}>
                    {f.originalName}
                  </Typography>
                  <Chip size="small" label={statusLabel(f.status)} />
                </Stack>

                {f.status === "REVISION_REQUESTED" && f.revisionMessage ? (
                  <Typography variant="body2" color="text.secondary">
                    Замечания: {f.revisionMessage}
                  </Typography>
                ) : null}

                <Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {f.mimeType === "application/pdf" ? (
                      <Link href={`/api/requests/${requestId}/contract-files/${f.id}/download?inline=1`} style={{ textDecoration: "none" }}>
                        <Button component="span" variant="outlined" disabled={busy}>
                          Открыть
                        </Button>
                      </Link>
                    ) : null}
                    <Link href={`/api/requests/${requestId}/contract-files/${f.id}/download`} style={{ textDecoration: "none" }}>
                      <Button component="span" variant="text" disabled={busy}>
                        Скачать
                      </Button>
                    </Link>
                  </Stack>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button
                    variant="contained"
                    color="success"
                    disabled={busy}
                    onClick={() => void approve(f.id)}
                  >
                    Одобрить
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    disabled={busy}
                    onClick={() => {
                      setRevisionFileId(f.id);
                      setRevisionOpen(true);
                    }}
                  >
                    На доработку
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {hasApproved ? (
        <Typography variant="body2" color="text.secondary">
          После одобрения вы сможете подтвердить акцепт оферты на странице заявки.
        </Typography>
      ) : null}

      <Dialog
        open={revisionOpen}
        onClose={() => {
          if (!busy) setRevisionOpen(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Отправить на доработку</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Typography color="text.secondary">
              Опишите, что нужно исправить в договоре.
            </Typography>
            <TextField
              label="Комментарий"
              value={revisionMessage}
              onChange={(e) => setRevisionMessage(e.target.value)}
              minRows={3}
              multiline
              disabled={busy}
              autoFocus
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setRevisionOpen(false)}>
            Отмена
          </Button>
          <Button variant="contained" color="warning" disabled={busy || revisionMessage.trim().length < 3} onClick={() => void submitRevision()}>
            Отправить
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

