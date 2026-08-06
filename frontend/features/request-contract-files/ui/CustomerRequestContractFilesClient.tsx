"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ContractFilesList } from "@/entities/request";

type ContractBundleStatus = "PENDING_CUSTOMER" | "APPROVED" | "REVISION_REQUESTED";
export type CustomerContractBundleListItem = {
  bundleId: string;
  status: ContractBundleStatus;
  revisionMessage: string | null;
  decidedAt: string | null;
  document: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
    updatedAt: string;
  };
  signature: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
    updatedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

function statusLabel(status: ContractBundleStatus) {
  if (status === "APPROVED") return "Одобрен";
  if (status === "REVISION_REQUESTED") return "На доработку";
  return "Ожидает решения";
}

export function CustomerRequestContractFilesClient({
  requestId,
  initialBundles,
  onBundlesChange,
}: {
  requestId: string;
  initialBundles: CustomerContractBundleListItem[];
  onBundlesChange?: (next: CustomerContractBundleListItem[]) => void;
}) {
  const [bundles, setBundles] = useState(initialBundles);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionBundleId, setRevisionBundleId] = useState<string | null>(null);
  const [revisionMessage, setRevisionMessage] = useState("");

  const hasPendingCustomerDecision = useMemo(
    () => bundles.some((b) => b.status === "PENDING_CUSTOMER"),
    [bundles],
  );

  useEffect(() => {
    setBundles(initialBundles);
  }, [initialBundles]);

  useEffect(() => {
    onBundlesChange?.(bundles);
  }, [bundles, onBundlesChange]);

  async function refresh() {
    const res = await fetch(`/api/requests/${requestId}/contract-bundles`, { cache: "no-store" });
    const payload = (await res.json().catch(() => null)) as CustomerContractBundleListItem[] | { error?: string } | null;
    if (res.ok && Array.isArray(payload)) setBundles(payload);
  }

  async function approve(bundleId: string) {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${requestId}/contract-bundles/${bundleId}/approve`, { method: "POST" });
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
    if (!revisionBundleId) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${requestId}/contract-bundles/${revisionBundleId}/revision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: revisionMessage }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | { ok?: boolean } | null;
      if (!res.ok) throw new Error(payload && typeof payload === "object" && "error" in payload ? payload.error ?? "Не удалось отправить на доработку" : "Не удалось отправить на доработку");
      setRevisionOpen(false);
      setRevisionBundleId(null);
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

      <ContractFilesList
        title="Документы исполнителя"
        actionsPlacement="below"
        showDocumentIcon
        items={bundles.map((b) => ({
          id: b.bundleId,
          status: b.status,
          originalName: b.document.originalName,
          mimeType: b.document.mimeType,
          sizeBytes: b.document.sizeBytes,
          revisionMessage: b.revisionMessage,
          decidedAt: b.decidedAt,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
        }))}
        revisionLabel="Замечания"
        empty={
          <Box sx={{ p: 2.5 }}>
            <Typography color="text.secondary">Компания ещё не прикрепила договор.</Typography>
          </Box>
        }
        getStatusLabel={statusLabel}
        renderActions={(f) => {
          const bundle = bundles.find((b) => b.bundleId === f.id);
          if (!bundle) return null;
          const canDecide = bundle.status === "PENDING_CUSTOMER";
          const signatureMissing = !bundle.signature;

          return (
            <>
              <Link
                href={`/api/requests/${requestId}/contract-files/${bundle.document.id}/download`}
                style={{ textDecoration: "none" }}
              >
                <Button component="span" variant="text" disabled={busy}>
                  Скачать договор
                </Button>
              </Link>
              {bundle.signature ? (
                <Link
                  href={`/api/requests/${requestId}/contract-files/${bundle.signature.id}/download`}
                  style={{ textDecoration: "none" }}
                >
                  <Button component="span" variant="text" disabled={busy}>
                    Скачать подпись
                  </Button>
                </Link>
              ) : (
                <Typography variant="body2" color="warning.main" sx={{ px: 1 }}>
                  Подпись (.sig) ещё не прикреплена
                </Typography>
              )}

              {canDecide ? (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    disabled={busy || signatureMissing}
                    onClick={() => void approve(bundle.bundleId)}
                  >
                    Одобрить
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    disabled={busy}
                    onClick={() => {
                      setRevisionBundleId(bundle.bundleId);
                      setRevisionOpen(true);
                    }}
                  >
                    На доработку
                  </Button>
                </>
              ) : null}
            </>
          );
        }}
      />

      {hasPendingCustomerDecision ? (
        <Typography variant="body2" color="text.secondary">
          После одобрения вы сможете подтвердить заключение договора на странице заявки.
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
            <Typography color="text.secondary">Опишите, что нужно исправить в договоре.</Typography>
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

