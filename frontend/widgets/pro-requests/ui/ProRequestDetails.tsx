"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Backdrop,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  getRequestStatusLabel,
  resolveRequestDetailBody,
  type RequestRemarkDto,
  type RequestProDto,
} from "@/entities/request";
import { isOrderExecutionStatus } from "@/entities/request";
import type { RequestDocumentRequestDto } from "@/entities/request";
import { OrderPassportPanel } from "@/widgets/pro-requests/ui/OrderPassportPanel";
import { RequestRemindersPanel } from "@/widgets/pro-requests/ui/RequestRemindersPanel";
import Link from "@/shared/ui/Link";
import { RequestDetailHeaderCard } from "@/shared/ui/RequestDetailHeaderCard";
import { createProviderRequestDetailsBehavior, RequestDetails } from "@/widgets/request-details";
import {
  completeProRequestRemark,
  createProRequestRemark,
  fetchProRequestRemarks,
} from "@/entities/request/api/request-remarks";
import {
  fetchProRequestContractFiles,
  uploadProRequestContractFiles,
  deleteProRequestContractFile,
  type ProContractFileStatus,
  type ProContractFileItem,
} from "@/entities/request/api/pro-contract-files";
import {
  createProRequestDocumentRequest,
  deleteProRequestDocumentRequest,
  fetchProRequestDocumentRequests,
} from "@/entities/request/api/request-document-requests";
import { ProRequestDocumentsSection } from "@/widgets/pro-requests/ui/ProRequestDocumentsSection";
import { useConfirm } from "@/shared/ui/confirm";

type Props = {
  initialRequest: RequestProDto;
  subtitle: string;
};

export function ProRequestDetails({ initialRequest, subtitle }: Props) {
  const [req, setReq] = useState(initialRequest);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadNames, setUploadNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [contractFilesLoaded, setContractFilesLoaded] = useState(false);
  const [contractFiles, setContractFiles] = useState<ProContractFileItem[]>([]);
  const [docRequestsLoaded, setDocRequestsLoaded] = useState(false);
  const [docRequests, setDocRequests] = useState<RequestDocumentRequestDto[]>([]);
  const [remarks, setRemarks] = useState<RequestRemarkDto[]>([]);
  const [remarksError, setRemarksError] = useState<string | null>(null);
  const confirm = useConfirm();

  const isBusy = busy || uploadBusy;
  const showContractWorkflow = !req.isLocked && req.offerStatus === "SELECTED";
  const hasPendingContractFiles = contractFiles.some((f) => f.status === "PENDING_CUSTOMER");
  const hasRevisionRequested = contractFiles.some((f) => f.status === "REVISION_REQUESTED");
  const hasApproved = contractFiles.some((f) => f.status === "APPROVED");
  const hasPendingRequestedDocs = docRequests.some((d) => d.status === "REQUESTED");
  const hasUploadedDocs = docRequests.some((d) => d.status === "UPLOADED");

  async function loadRemarks() {
    const list = await fetchProRequestRemarks(req.id);
    setRemarks(list);
  }

  useEffect(() => {
    if (!isOrderExecutionStatus(req.status)) {
      setRemarks([]);
      setRemarksError(null);
      return;
    }
    let cancelled = false;
    setRemarksError(null);
    (async () => {
      try {
        const list = await fetchProRequestRemarks(req.id);
        if (!cancelled) setRemarks(list);
      } catch (e) {
        if (!cancelled) setRemarksError(e instanceof Error ? e.message : "Не удалось загрузить замечания");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [req.id, req.status]);

  useEffect(() => {
    if (!showContractWorkflow || contractFilesLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const payload = await fetchProRequestContractFiles(req.id);
        if (cancelled) return;
        setContractFiles(payload);
        setContractFilesLoaded(true);
      } catch (e) {
        if (!cancelled) {
          setContractFilesLoaded(true);
          setError(e instanceof Error ? e.message : "Не удалось загрузить файлы договора");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contractFilesLoaded, req.id, showContractWorkflow]);

  useEffect(() => {
    if (!showContractWorkflow || docRequestsLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const payload = await fetchProRequestDocumentRequests(req.id);
        if (cancelled) return;
        setDocRequests(payload);
        setDocRequestsLoaded(true);
      } catch (e) {
        if (!cancelled) {
          setDocRequestsLoaded(true);
          setError(e instanceof Error ? e.message : "Не удалось загрузить список документов");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [docRequestsLoaded, req.id, showContractWorkflow]);

  async function refresh() {
    const res = await fetch(`/api/pro/requests/${req.id}`, { cache: "no-store" });
    const payload = (await res.json().catch(() => null)) as { error?: string } | RequestProDto | null;
    if (!res.ok) {
      throw new Error(payload && typeof payload === "object" && "error" in payload ? payload.error ?? "Не удалось обновить заявку" : "Не удалось обновить заявку");
    }
    setReq(payload as RequestProDto);
  }

  async function refreshContractFiles() {
    try {
      const payload = await fetchProRequestContractFiles(req.id);
      setContractFiles(payload);
    } catch {
      // Keep previous list; the upload handler will surface errors when needed.
    }
  }

  async function refreshDocRequests() {
    try {
      const payload = await fetchProRequestDocumentRequests(req.id);
      setDocRequests(payload);
    } catch {
      // Keep previous list.
    }
  }

  async function createDocRequest(title: string) {
    const normalized = title.trim();
    if (normalized.length < 3) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await createProRequestDocumentRequest(req.id, normalized);
      await refreshDocRequests();
      setNotice("Запрос документа отправлен.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось запросить документ");
    } finally {
      setBusy(false);
    }
  }

  async function cancelDocRequest(docRequestId: string) {
    const ok = await confirm({
      title: "Удалить запрос документа?",
      description: "Клиент больше не увидит этот запрос в списке документов.",
      confirmText: "Удалить",
      confirmColor: "error",
    });
    if (!ok) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await deleteProRequestDocumentRequest(req.id, docRequestId);
      await refreshDocRequests();
      setNotice("Запрос документа отменён.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отменить запрос документа");
    } finally {
      setBusy(false);
    }
  }

  function isOptimisticFileId(id: string) {
    return id.startsWith("temp:");
  }

  async function uploadContractFiles(files: File[]) {
    if (files.length === 0) return;
    const startedAt = Date.now();
    const nowIso = new Date().toISOString();
    const optimistic = files.map<ProContractFileItem>((f, idx) => ({
      id: `temp:${startedAt}:${idx}`,
      status: "PENDING_CUSTOMER",
      originalName: f.name,
      mimeType: f.type || "application/octet-stream",
      sizeBytes: f.size,
      revisionMessage: null,
      decidedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    }));

    setUploadBusy(true);
    setUploadNames(files.map((f) => f.name));
    setError(null);
    setNotice(null);
    setContractFiles((prev) => [...optimistic, ...prev.filter((x) => !isOptimisticFileId(x.id))]);
    try {
      await uploadProRequestContractFiles(req.id, files);
      await Promise.all([refresh(), refreshContractFiles()]);
      setNotice("Файлы договора прикреплены к заявке.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить файлы");
      const optimisticIds = new Set(optimistic.map((x) => x.id));
      setContractFiles((prev) => prev.filter((x) => !optimisticIds.has(x.id)));
    } finally {
      const elapsed = Date.now() - startedAt;
      const minMs = 600;
      if (elapsed < minMs) {
        await new Promise((r) => setTimeout(r, minMs - elapsed));
      }
      setUploadBusy(false);
      setUploadNames([]);
    }
  }

  async function deleteContractFile(fileId: string) {
    const ok = await confirm({
      title: "Удалить файл?",
      description: "Файл будет удалён из заявки. Это действие нельзя отменить.",
      confirmText: "Удалить",
      confirmColor: "error",
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await deleteProRequestContractFile(fileId);
      await refreshContractFiles();
      setNotice("Файл удалён.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить файл");
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action: "confirm" | "decline") {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (action === "confirm") {
        if (req.status === "CONTRACT_ACCEPTED") {
          const res = await fetch(`/api/pro/requests/${req.id}/start-work`, { method: "POST" });
          const payload = (await res.json().catch(() => null)) as { error?: string } | unknown | null;
          if (!res.ok) throw new Error(payload && typeof payload === "object" && payload && "error" in (payload as any) ? ((payload as any).error as string) : "Не удалось начать работу");
          await refresh();
          setNotice("Работа начата.");
          return;
        }
        if (req.status === "ACTIVE") {
          const res = await fetch(`/api/pro/requests/${req.id}/mark-rendered`, { method: "POST" });
          const payload = (await res.json().catch(() => null)) as { error?: string } | unknown | null;
          if (!res.ok) throw new Error(payload && typeof payload === "object" && payload && "error" in (payload as any) ? ((payload as any).error as string) : "Не удалось отметить выполнение");
          await refresh();
          setNotice("Услуга отмечена как оказанная.");
          return;
        }
        if (req.status === "SERVICE_RENDERED") {
          const res = await fetch(`/api/pro/requests/${req.id}/request-acceptance`, { method: "POST" });
          const payload = (await res.json().catch(() => null)) as { error?: string } | unknown | null;
          if (!res.ok) throw new Error(payload && typeof payload === "object" && payload && "error" in (payload as any) ? ((payload as any).error as string) : "Не удалось запросить принятие");
          await refresh();
          setNotice("Передано на принятие клиенту.");
          return;
        }
        if (req.status === "ACCEPTED") {
          const res = await fetch(`/api/pro/requests/${req.id}/complete`, { method: "POST" });
          const payload = (await res.json().catch(() => null)) as { error?: string } | unknown | null;
          if (!res.ok) throw new Error(payload && typeof payload === "object" && payload && "error" in (payload as any) ? ((payload as any).error as string) : "Не удалось завершить");
          await refresh();
          setNotice("Сделка завершена.");
          return;
        }
      }

      if (action === "decline") {
        const res = await fetch(`/api/pro/requests/${req.id}/decline-offer`, { method: "POST" });
        const payload = (await res.json().catch(() => null)) as { error?: string } | RequestProDto | null;
        if (!res.ok) {
          throw new Error(
            payload && typeof payload === "object" && "error" in payload
              ? payload.error ?? "Не удалось отказать"
              : "Не удалось отказать"
          );
        }
        setReq(payload as RequestProDto);
        setNotice("Вы отказались от предложения.");
        return;
      }

      throw new Error("Unsupported action");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось выполнить действие");
    } finally {
      setBusy(false);
    }
  }

  async function remarkAdd(text: string) {
    const normalized = text.trim();
    if (normalized.length < 3) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await createProRequestRemark(req.id, normalized);
      await loadRemarks();
      setNotice("Замечание добавлено.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить замечание");
    } finally {
      setBusy(false);
    }
  }

  async function remarkComplete(remarkId: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await completeProRequestRemark(req.id, remarkId);
      await loadRemarks();
      setNotice("Замечание отмечено как выполненное.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отметить замечание выполненным");
    } finally {
      setBusy(false);
    }
  }

  const messageBody = resolveRequestDetailBody(req.message, req.serviceTitle);

  return (
    <Stack spacing={2}>
      <RequestDetailHeaderCard
        subtitle={subtitle}
        statusLabel={getRequestStatusLabel(req.status)}
        body={messageBody}
      />

      {notice ? <Alert severity="success">{notice}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {remarksError ? <Alert severity="warning">{remarksError}</Alert> : null}

      <Backdrop
        open={uploadBusy}
        sx={(theme) => ({
          zIndex: theme.zIndex.modal + 1,
          bgcolor: "rgba(0,0,0,0.45)",
          px: 2,
        })}
      >
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            width: "100%",
            maxWidth: 560,
          }}
        >
          <Stack spacing={1.25}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <CircularProgress size={18} />
              <Typography fontWeight={900}>Загружаем файлы…</Typography>
            </Stack>
            <LinearProgress />
            {uploadNames.length > 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                {uploadNames.join(", ")}
              </Typography>
            ) : null}
          </Stack>
        </Paper>
      </Backdrop>

      <RequestDetails
        busy={isBusy}
        behavior={createProviderRequestDetailsBehavior({
          request: req,
          bottomSlot: isOrderExecutionStatus(req.status) ? <OrderPassportPanel orderId={req.id} /> : null,
          remarks,
          actions: {
            startWork: () => runAction("confirm"),
            markRendered: () => runAction("confirm"),
            requestAcceptance: () => runAction("confirm"),
            complete: () => runAction("confirm"),
            declineOffer: () => runAction("decline"),
            remarkAdd,
            remarkComplete,
          },
        })}
      />

      <ProRequestDocumentsSection
        open={showContractWorkflow}
        requestId={req.id}
        requestStatus={req.status}
        isBusy={isBusy}
        docRequestsLoaded={docRequestsLoaded}
        contractFilesLoaded={contractFilesLoaded}
        docRequests={docRequests}
        contractFiles={contractFiles}
        uploadBusy={uploadBusy}
        uploadNames={uploadNames}
        isOptimisticFileId={isOptimisticFileId}
        onCreateDocRequest={createDocRequest}
        onCancelDocRequest={cancelDocRequest}
        onUploadContractFiles={uploadContractFiles}
        onDeleteContractFile={deleteContractFile}
      />

      <RequestRemindersPanel requestId={req.id} />

    </Stack>
  );
}
