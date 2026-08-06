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
import { RequestRemindersPanel } from "@/widgets/pro-requests/ui/RequestRemindersPanel";
import Link from "@/shared/ui/Link";
import { RequestDetailHeaderCard } from "@/shared/ui/RequestDetailHeaderCard";
import { createProviderRequestDetailsBehavior, RequestDetails } from "@/widgets/request-details";
import {
  createProviderRequestRemarksBehavior,
  RequestRemarks,
} from "@/widgets/request-remarks";
import {
  completeProRequestRemark,
  createProRequestRemark,
  fetchProRequestRemarks,
} from "@/entities/request/api/request-remarks";
import {
  deleteProRequestContractFile,
} from "@/entities/request/api/pro-contract-files";
import type { ProContractBundleItem, ProMiscFileItem } from "@/entities/request/api/pro-contract-bundles";
import {
  deleteProRequestContractBundle,
  fetchProRequestContractBundles,
  fetchProRequestMiscFiles,
  uploadProRequestContractBundle,
  uploadProRequestMiscFiles,
} from "@/entities/request/api/pro-contract-bundles";
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
  const [contractBundlesLoaded, setContractBundlesLoaded] = useState(false);
  const [contractBundles, setContractBundles] = useState<ProContractBundleItem[]>([]);
  const [miscLoaded, setMiscLoaded] = useState(false);
  const [miscFiles, setMiscFiles] = useState<ProMiscFileItem[]>([]);
  const [docRequestsLoaded, setDocRequestsLoaded] = useState(false);
  const [docRequests, setDocRequests] = useState<RequestDocumentRequestDto[]>([]);
  const [remarks, setRemarks] = useState<RequestRemarkDto[]>([]);
  const [remarksError, setRemarksError] = useState<string | null>(null);
  const confirm = useConfirm();

  const isBusy = busy || uploadBusy;
  const showContractWorkflow = !req.isLocked && req.offerStatus === "SELECTED";
  const hasPendingContractFiles = contractBundles.some((b) => b.status === "PENDING_CUSTOMER");
  const hasRevisionRequested = contractBundles.some((b) => b.status === "REVISION_REQUESTED");
  const hasApproved = contractBundles.some((b) => b.status === "APPROVED");
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
    if (!showContractWorkflow || contractBundlesLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const payload = await fetchProRequestContractBundles(req.id);
        if (cancelled) return;
        setContractBundles(payload);
        setContractBundlesLoaded(true);
      } catch (e) {
        if (!cancelled) {
          setContractBundlesLoaded(true);
          setError(e instanceof Error ? e.message : "Не удалось загрузить договоры");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contractBundlesLoaded, req.id, showContractWorkflow]);

  useEffect(() => {
    if (!showContractWorkflow || miscLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const payload = await fetchProRequestMiscFiles(req.id);
        if (cancelled) return;
        setMiscFiles(payload);
        setMiscLoaded(true);
      } catch (e) {
        if (!cancelled) {
          setMiscLoaded(true);
          setError(e instanceof Error ? e.message : "Не удалось загрузить документы");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [miscLoaded, req.id, showContractWorkflow]);

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

  async function refreshContractBundles() {
    try {
      const payload = await fetchProRequestContractBundles(req.id);
      setContractBundles(payload);
    } catch {
      // Keep previous list; the upload handler will surface errors when needed.
    }
  }

  async function refreshMiscFiles() {
    try {
      const payload = await fetchProRequestMiscFiles(req.id);
      setMiscFiles(payload);
    } catch {
      // Keep previous list.
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

  async function uploadContractBundle(input: { document: File; signature: File }) {
    const startedAt = Date.now();
    setUploadBusy(true);
    setUploadNames([input.document.name, input.signature.name]);
    setError(null);
    setNotice(null);
    try {
      await uploadProRequestContractBundle(req.id, input);
      await Promise.all([refresh(), refreshContractBundles()]);
      setNotice("Договор прикреплён к заявке.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить договор");
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

  async function deleteContractBundle(bundleId: string) {
    const ok = await confirm({
      title: "Удалить пакет договора?",
      description: "Договор и подпись будут удалены из заявки. Это действие нельзя отменить.",
      confirmText: "Удалить пакет",
      confirmColor: "error",
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await deleteProRequestContractBundle(req.id, bundleId);
      await refreshContractBundles();
      setNotice("Пакет удалён.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить пакет");
    } finally {
      setBusy(false);
    }
  }

  async function uploadMiscFiles(files: File[]) {
    if (files.length === 0) return;
    const startedAt = Date.now();
    setUploadBusy(true);
    setUploadNames(files.map((f) => f.name));
    setError(null);
    setNotice(null);
    try {
      await uploadProRequestMiscFiles(req.id, files);
      await refreshMiscFiles();
      setNotice("Документы прикреплены.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить документы");
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

  async function deleteMiscFile(fileId: string) {
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
      await refreshMiscFiles();
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
        if (req.status === "ACTIVE") {
          const res = await fetch(`/api/pro/requests/${req.id}/mark-rendered`, { method: "POST" });
          const payload = (await res.json().catch(() => null)) as { error?: string } | unknown | null;
          if (!res.ok) throw new Error(payload && typeof payload === "object" && payload && "error" in (payload as any) ? ((payload as any).error as string) : "Не удалось отметить работу");
          await refresh();
          setNotice("Услуга передана на принятие клиенту.");
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
          bottomSlot: null,
          isMarkRenderedDisabled: remarks.some((r) => r.status === "OPEN"),
          actions: {
            startWork: async () => undefined,
            markRendered: async () => {
              const ok = await confirm({
                title: "Услуга выполнена?",
                description:
                  "Заявка перейдёт в статус «Ожидает принятия». Клиент сможет принять результат или отправить замечания. Это действие нельзя отменить.",
                confirmText: "Да, выполнена",
                confirmColor: "success",
              });
              if (!ok) return;
              await runAction("confirm");
            },
            requestAcceptance: async () => undefined,
            complete: () => runAction("confirm"),
            declineOffer: async () => {
              const ok = await confirm({
                title: "Отказаться от заявки?",
                description:
                  "Вы больше не будете исполнителем по этой заявке. Клиент сможет выбрать другого исполнителя. Это действие нельзя отменить.",
                confirmText: "Да, отказать",
                confirmColor: "error",
              });
              if (!ok) return;
              await runAction("decline");
            },
          },
        })}
      />

      <RequestRemarks
        busy={isBusy}
        behavior={createProviderRequestRemarksBehavior({
          request: req,
          remarks,
          actions: {
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
        contractBundlesLoaded={contractBundlesLoaded}
        miscLoaded={miscLoaded}
        docRequests={docRequests}
        contractBundles={contractBundles}
        miscFiles={miscFiles}
        uploadBusy={uploadBusy}
        uploadNames={uploadNames}
        onCreateDocRequest={createDocRequest}
        onCancelDocRequest={cancelDocRequest}
        onUploadContractBundle={uploadContractBundle}
        onDeleteContractBundle={deleteContractBundle}
        onUploadMiscFiles={uploadMiscFiles}
        onDeleteMiscFile={deleteMiscFile}
      />

      <RequestRemindersPanel requestId={req.id} />

    </Stack>
  );
}
