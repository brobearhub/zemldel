"use client";

import { useEffect, useMemo, useState } from "react";
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
  buildRequestFlowSteps,
  getRequestFlowActiveStepId,
  getRequestStatusLabel,
  isOpenRequestStatus,
  resolveRequestDetailBody,
  StatusProgressList,
  StatusProgressStepper,
  StatusProgressViewToggle,
  type RequestProDto,
  useStatusProgressView,
} from "@/entities/request";
import { isOrderExecutionStatus } from "@/entities/request";
import { OrderPassportPanel } from "@/widgets/pro-requests/ui/OrderPassportPanel";
import { RequestRemindersPanel } from "@/widgets/pro-requests/ui/RequestRemindersPanel";
import Link from "@/shared/ui/Link";
import { RequestDetailHeaderCard } from "@/shared/ui/RequestDetailHeaderCard";
import {
  fetchProRequestContractFiles,
  uploadProRequestContractFiles,
  type ProContractFileStatus,
  type ProContractFileItem,
} from "@/entities/request/api/pro-contract-files";

type Props = {
  initialRequest: RequestProDto;
  subtitle: string;
};

type NextAction = { action: "confirm" | "decline"; label: string };

function getNextActions(req: RequestProDto): NextAction[] {
  if (req.status === "CLOSED") return [];
  if (req.isLocked) return [];

  if (req.status === "CONTRACT_ACCEPTED") return [{ action: "confirm", label: "Начать работу" }];
  if (req.status === "ACTIVE") return [{ action: "confirm", label: "Услуга выполнена" }];
  if (req.status === "SERVICE_RENDERED") return [{ action: "confirm", label: "Передать на принятие" }];
  if (req.status === "ACCEPTED") return [{ action: "confirm", label: "Завершить" }];

  if (!isOrderExecutionStatus(req.status) && req.offerStatus === "SELECTED") {
    return [{ action: "decline", label: "Отказать" }];
  }

  return [];
}

function contractFileStatusLabel(status: ProContractFileStatus) {
  if (status === "APPROVED") return "Одобрен";
  if (status === "REVISION_REQUESTED") return "На доработку";
  return "Ожидает решения клиента";
}

export function ProRequestDetails({ initialRequest, subtitle }: Props) {
  const [req, setReq] = useState(initialRequest);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadNames, setUploadNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [contractFilesLoaded, setContractFilesLoaded] = useState(false);
  const [contractFiles, setContractFiles] = useState<ProContractFileItem[]>([]);
  const [statusView, setStatusView] = useStatusProgressView();

  const isBusy = busy || uploadBusy;
  const nextActions = useMemo(() => getNextActions(req), [req]);
  const showContractWorkflow = !req.isLocked && req.offerStatus === "SELECTED";
  const hasPendingContractFiles = contractFiles.some((f) => f.status === "PENDING_CUSTOMER");
  const hasRevisionRequested = contractFiles.some((f) => f.status === "REVISION_REQUESTED");
  const hasApproved = contractFiles.some((f) => f.status === "APPROVED");
  const pendingInfo =
    req.offerStatus === "SELECTED"
      ? "Клиент выбрал вас исполнителем. Подготовьте и отправьте договор."
      : req.offerStatus === "DECLINED"
        ? "Вы отказались от предложения."
        : null;

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

      <Paper
        variant="outlined"
        sx={(theme) => ({
          p: 2.5,
          ...(req.isLocked
            ? {
                bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "action.hover",
                borderColor: "divider",
              }
            : null),
        })}
      >
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
            <Typography variant="h6" fontWeight={800}>
              Детали
            </Typography>
            <StatusProgressViewToggle value={statusView} onChange={setStatusView} />
          </Stack>

          {statusView === "list" ? (
            <StatusProgressList
              steps={buildRequestFlowSteps(req.status)}
              activeStepId={getRequestFlowActiveStepId(req.status)}
              muted={req.isLocked}
            />
          ) : (
            <StatusProgressStepper
              steps={buildRequestFlowSteps(req.status)}
              activeStepId={getRequestFlowActiveStepId(req.status)}
              muted={req.isLocked}
            />
          )}
          {req.isLocked ? (
            <Alert
              severity="warning"
              variant="outlined"
              sx={{
                mt: 0.5,
                "& .MuiAlert-message": { width: "100%" },
                "& .MuiAlert-icon": { alignSelf: "flex-start", mt: "2px" },
              }}
            >
              <Typography variant="body2" fontWeight={800}>
                Заказ уже оформлен другим провайдером.
              </Typography>
            </Alert>
          ) : null}
          {!req.isLocked && pendingInfo ? (
            <Typography variant="body2" color="text.secondary">
              {pendingInfo}
            </Typography>
          ) : null}
          {req.location ? (
            <Typography variant="body2" color="text.secondary">
              Локация: {req.location}
            </Typography>
          ) : null}
          <Typography variant="body2" color="text.secondary">
            Диалогов: {req.conversationsCount}
          </Typography>
          {isOrderExecutionStatus(req.status) ? (
            <OrderPassportPanel orderId={req.id} />
          ) : null}
        </Stack>
      </Paper>

      <RequestRemindersPanel requestId={req.id} />

      {showContractWorkflow ? (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  Документы
                </Typography>
              </Box>
              {contractFiles.length > 0 ? (
                <Chip
                  size="small"
                  label={
                    hasRevisionRequested
                      ? "Есть замечания"
                      : hasPendingContractFiles
                        ? "Ожидает решения клиента"
                        : hasApproved
                          ? "Одобрено"
                          : "Документы"
                  }
                />
              ) : null}
            </Stack>

            {contractFiles.length === 0 ? <Alert severity="info">Договор ещё не прикреплён к заявке.</Alert> : null}
            {hasRevisionRequested ? (
              <Alert severity="warning">Клиент запросил доработку по одному или нескольким файлам.</Alert>
            ) : hasPendingContractFiles ? (
              <Alert severity="info">Файлы у клиента. Он может скачать и одобрить договор или отправить на доработку.</Alert>
            ) : hasApproved ? (
              <Alert severity="success">Есть одобренные файлы договора.</Alert>
            ) : null}

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                component="label"
                variant="contained"
                disabled={isBusy}
                startIcon={uploadBusy ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {uploadBusy ? "Загрузка…" : "Загрузить файлы"}
                <input
                  hidden
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => {
                    const next = Array.from(e.currentTarget.files ?? []);
                    e.currentTarget.value = "";
                    void uploadContractFiles(next);
                  }}
                />
              </Button>
            </Stack>

            {!contractFilesLoaded ? (
              <Alert
                severity="info"
                icon={<CircularProgress size={16} />}
                sx={{
                  "& .MuiAlert-message": { width: "100%" },
                  "& .MuiAlert-icon": { alignSelf: "flex-start", mt: "2px" },
                }}
              >
                Загружаем список документов…
              </Alert>
            ) : null}

            {uploadBusy ? (
              <Paper
                variant="outlined"
                sx={(theme) => ({
                  p: 1.5,
                  bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "action.hover",
                  borderColor: "divider",
                })}
              >
                <Stack spacing={1}>
                  <Typography fontWeight={800}>Идёт загрузка файлов</Typography>
                  <LinearProgress />
                  {uploadNames.length > 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                      {uploadNames.join(", ")}
                    </Typography>
                  ) : null}
                </Stack>
              </Paper>
            ) : null}

            {contractFiles.length > 0 ? (
              <Stack spacing={1}>
                {contractFiles.map((file) => (
                  <Paper key={file.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack spacing={0.75}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography fontWeight={800} sx={{ wordBreak: "break-word" }}>
                          {file.originalName}
                        </Typography>
                        <Chip
                          size="small"
                          color={isOptimisticFileId(file.id) ? "info" : undefined}
                          label={isOptimisticFileId(file.id) ? "Загружается…" : contractFileStatusLabel(file.status)}
                        />
                      </Stack>
                      {file.status === "REVISION_REQUESTED" && file.revisionMessage ? (
                        <Typography variant="body2" color="text.secondary">
                          Комментарий клиента: {file.revisionMessage}
                        </Typography>
                      ) : null}
                      {isOptimisticFileId(file.id) ? <LinearProgress /> : null}
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {!isOptimisticFileId(file.id) && file.mimeType === "application/pdf" ? (
                          <Button
                            component={Link}
                            href={`/api/pro/contract-files/${file.id}/download?inline=1`}
                            variant="outlined"
                            disabled={isBusy}
                          >
                            Открыть
                          </Button>
                        ) : null}
                        {!isOptimisticFileId(file.id) ? (
                          <Button
                            component={Link}
                            href={`/api/pro/contract-files/${file.id}/download`}
                            variant="text"
                            disabled={isBusy}
                          >
                            Скачать
                          </Button>
                        ) : null}
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : null}
          </Stack>
        </Paper>
      ) : null}

      {nextActions.length > 0 ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {nextActions.map((a) => (
            <Button
              key={a.action}
              variant="contained"
              color={a.action === "confirm" ? "success" : "secondary"}
              disabled={isBusy}
              onClick={() => void runAction(a.action)}
            >
              {a.label}
            </Button>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}
