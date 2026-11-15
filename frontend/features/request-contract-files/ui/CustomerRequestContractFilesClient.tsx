"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  RequestDocumentDownload,
  RequestDocumentFileCard,
} from "@/entities/request/ui/RequestDocumentFileCard";

type ContractBundleStatus =
  | "PENDING_CUSTOMER"
  | "APPROVED"
  | "REVISION_REQUESTED";
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
  return "Ожидает вашего решения";
}

export function CustomerRequestContractFilesClient({
  requestId,
  bundles,
  onBundlesChange,
  onBusyChange,
  disabled = false,
}: {
  requestId: string;
  bundles: CustomerContractBundleListItem[];
  onBundlesChange?: (next: CustomerContractBundleListItem[]) => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const controlsDisabled = busy || disabled;
  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [onBusyChange, busy]);
  const [approvingBundleId, setApprovingBundleId] = useState<string | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionBundleId, setRevisionBundleId] = useState<string | null>(null);
  const [revisionMessage, setRevisionMessage] = useState("");

  const hasPendingCustomerDecision = useMemo(
    () => bundles.some((b) => b.status === "PENDING_CUSTOMER"),
    [bundles],
  );

  async function refresh() {
    const res = await fetch(`/api/requests/${requestId}/contract-bundles`, {
      cache: "no-store",
    });
    const payload = (await res.json().catch(() => null)) as
      | CustomerContractBundleListItem[]
      | { error?: string }
      | null;
    if (res.ok && Array.isArray(payload)) onBundlesChange?.(payload);
  }

  async function approve(bundleId: string) {
    setBusy(true);
    setApprovingBundleId(bundleId);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/requests/${requestId}/contract-bundles/${bundleId}/approve`,
        { method: "POST" },
      );
      const payload = (await res.json().catch(() => null)) as
        | { error?: string }
        | { ok?: boolean }
        | null;
      if (!res.ok)
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? (payload.error ?? "Не удалось одобрить")
            : "Не удалось одобрить",
        );
      await refresh();
      setNotice("Договор одобрен.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось одобрить");
    } finally {
      setBusy(false);
      setApprovingBundleId(null);
    }
  }

  async function submitRevision() {
    if (!revisionBundleId) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/requests/${requestId}/contract-bundles/${revisionBundleId}/revision`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: revisionMessage }),
        },
      );
      const payload = (await res.json().catch(() => null)) as
        | { error?: string }
        | { ok?: boolean }
        | null;
      if (!res.ok)
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? (payload.error ?? "Не удалось отправить на доработку")
            : "Не удалось отправить на доработку",
        );
      setRevisionOpen(false);
      setRevisionBundleId(null);
      setRevisionMessage("");
      await refresh();
      setNotice("Запрос на доработку отправлен компании.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось отправить на доработку",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2}>
      {notice ? <Alert severity="success">{notice}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      {bundles.length === 0 ? (
        <>
          <Typography
            variant="h3"
            sx={{
              fontSize: "1.5rem",
              fontWeight: 700,
            }}
          >
            Договор ещё не загружен
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
            Исполнитель готовит договор. Когда он прикрепит файл, вы сможете
            скачать его, одобрить или отправить на доработку.
          </Typography>
        </>
      ) : null}

      {bundles.map((bundle) => (
        <Stack
          key={bundle.bundleId}
          spacing={1.5}
          sx={{
            minWidth: 0,
          }}
        >
          <RequestDocumentFileCard
            title={bundle.document.originalName}
            actions={
              <RequestDocumentDownload
                href={`/api/requests/${requestId}/contract-files/${bundle.document.id}/download`}
                name={bundle.document.originalName}
                disabled={controlsDisabled}
              />
            }
          />
          <Typography variant="body2">{statusLabel(bundle.status)}</Typography>
          {bundle.revisionMessage ? (
            <Typography
              variant="body2"
              sx={{
                overflowWrap: "anywhere",
              }}
            >
              Ваши замечания: {bundle.revisionMessage}
            </Typography>
          ) : null}
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              overflowWrap: "anywhere",
            }}
          >
            {bundle.signature
              ? `Подпись: ${bundle.signature.originalName}`
              : "Файл подписи не приложен."}
          </Typography>
          {bundle.signature ? (
            <Button
              component={Link}
              href={`/api/requests/${requestId}/contract-files/${bundle.signature.id}/download`}
              prefetch={false}
              variant="text"
              color="inherit"
              disabled={controlsDisabled}
              sx={{
                alignSelf: "flex-start",
                minWidth: 0,
              }}
            >
              Скачать подпись
            </Button>
          ) : null}
          {bundle.status === "PENDING_CUSTOMER" ? (
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <Button
                variant="outlined"
                color="warning"
                disabled={controlsDisabled}
                onClick={() => {
                  setRevisionBundleId(bundle.bundleId);
                  setRevisionOpen(true);
                }}
              >
                На доработку
              </Button>
              <Button
                variant="contained"
                color="success"
                loading={approvingBundleId === bundle.bundleId}
                disabled={controlsDisabled}
                onClick={() => void approve(bundle.bundleId)}
              >
                Одобрить
              </Button>
            </Stack>
          ) : null}
        </Stack>
      ))}

      {hasPendingCustomerDecision ? (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
          }}
        >
          После одобрения вы сможете подтвердить заключение договора на странице
          заявки.
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
            <Typography
              sx={{
                color: "text.secondary",
              }}
            >
              Опишите, что нужно исправить в договоре.
            </Typography>
            <TextField
              label="Комментарий"
              value={revisionMessage}
              onChange={(e) => setRevisionMessage(e.target.value)}
              minRows={3}
              multiline
              disabled={controlsDisabled}
              autoFocus
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            disabled={controlsDisabled}
            onClick={() => setRevisionOpen(false)}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            color="warning"
            loading={busy}
            disabled={controlsDisabled || revisionMessage.trim().length < 3}
            onClick={() => void submitRevision()}
          >
            Отправить
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
