"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { ChatServiceRequestConversationListItemDto } from "@/entities/chat/dto/chat.dto";
import {
  getRequestStatusLabel,
  isExclusiveProviderPhaseStatus,
  isOrderExecutionStatus,
  resolveRequestDetailBody,
  type RequestDocumentRequestDto,
  type RequestRemarkDto,
  type RequestCustomerDto,
} from "@/entities/request";
import {
  completeCustomerRequestRemark,
  createCustomerRequestRemark,
  fetchCustomerRequestRemarks,
} from "@/entities/request/api/request-remarks";
import { ChatBodyWithSidePanelLayout } from "@/widgets/chat/ui/ChatBodyWithSidePanelLayout";
import { ServiceRequestChatPanel } from "@/widgets/chat/ui/ServiceRequestChatPanel";
import Link from "@/shared/ui/Link";
import { RequestDetailHeaderCard } from "@/shared/ui/RequestDetailHeaderCard";
import { createCustomerRequestDetailsBehavior, RequestDetails } from "@/widgets/request-details";
import {
  fetchCustomerRequestDocumentRequests,
  uploadCustomerRequestDocument,
  deleteCustomerRequestDocumentFile,
} from "@/entities/request/api/request-document-requests";
import type { CustomerContractFileListItem } from "@/features/request-contract-files/ui/CustomerRequestContractFilesClient";
import { canCustomerAcceptContract } from "@/widgets/customer-requests/lib/can-accept-contract";
import { CustomerRequestDocumentsSection } from "@/widgets/customer-requests/ui/CustomerRequestDocumentsSection";
import { useConfirm } from "@/shared/ui/confirm";

function pickTitle(req: RequestCustomerDto) {
  if (req.subjectType === "SERVICE") return req.serviceTitle ?? "Заявка по услуге";
  if (req.subjectType === "CATEGORY") return "Заявка по категории";
  return "Свободная заявка";
}

type Props = {
  initialRequest: RequestCustomerDto;
};

export function CustomerRequestConversationWorkspace({ initialRequest }: Props) {
  const router = useRouter();
  const [req, setReq] = useState<RequestCustomerDto>(initialRequest);
  const [conversations, setConversations] = useState<ChatServiceRequestConversationListItemDto[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [contractFiles, setContractFiles] = useState<CustomerContractFileListItem[]>([]);
  const [docRequests, setDocRequests] = useState<RequestDocumentRequestDto[]>([]);
  const [docUploadBusy, setDocUploadBusy] = useState(false);
  const [remarks, setRemarks] = useState<RequestRemarkDto[]>([]);
  const [remarksError, setRemarksError] = useState<string | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerBusy, setOfferBusy] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerVersion, setOfferVersion] = useState<string | null>(null);
  const [offerMarkdown, setOfferMarkdown] = useState<string | null>(null);
  const [offerAccepted, setOfferAccepted] = useState(false);
  const confirm = useConfirm();

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.conversationId === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const loadConversations = useCallback(async () => {
    const res = await fetch(`/api/chat/requests/${req.id}/conversations`, { cache: "no-store" });
    const payload = (await res.json().catch(() => null)) as ChatServiceRequestConversationListItemDto[] | { error?: string } | null;
    if (!res.ok) {
      throw new Error(
        payload && typeof payload === "object" && !Array.isArray(payload) && payload.error ? payload.error : "Не удалось загрузить чаты"
      );
    }
    return payload as ChatServiceRequestConversationListItemDto[];
  }, [req.id]);

  const refreshRequest = useCallback(async () => {
    const res = await fetch(`/api/requests/${req.id}`, { cache: "no-store" });
    const payload = (await res.json().catch(() => null)) as RequestCustomerDto | { error?: string } | null;
    if (!res.ok) {
      throw new Error(
        payload && typeof payload === "object" && "error" in payload && payload.error ? payload.error : "Не удалось обновить заявку"
      );
    }
    setReq(payload as RequestCustomerDto);
  }, [req.id]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setNotice(null);
    (async () => {
      try {
        const list = await loadConversations();
        if (cancelled) return;
        setConversations(list);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить чаты");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadConversations]);

  const loadRemarks = useCallback(async () => {
    const list = await fetchCustomerRequestRemarks(req.id);
    setRemarks(list);
  }, [req.id]);

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
        const list = await fetchCustomerRequestRemarks(req.id);
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
    if (selectedConversationId) return;
    if (conversations.length > 0) {
      setSelectedConversationId(conversations[0].conversationId);
    }
  }, [conversations, selectedConversationId]);

  const activeOffer =
    req.offers.find((offer) => offer.providerId === selectedConversation?.providerId) ??
    req.offers.find((offer) => req.selectedProviderIds.includes(offer.providerId)) ??
    null;

  const isExecutionStatus = isOrderExecutionStatus(req.status);
  const isExclusiveStatus = isExclusiveProviderPhaseStatus(req.status);
  const hasContractFiles = contractFiles.length > 0;
  const hasApprovedContractFile = contractFiles.some((f) => f.status === "APPROVED");
  const hasRevisionRequested = contractFiles.some((f) => f.status === "REVISION_REQUESTED");
  const hasPending = contractFiles.some((f) => f.status === "PENDING_CUSTOMER");
  const allRequestedDocumentsUploaded = docRequests.every((d) => d.status === "UPLOADED");
  const canAcceptContract = canCustomerAcceptContract({
    requestStatus: req.status,
    contractFiles,
    documentRequests: docRequests,
  });

  useEffect(() => {
    if (!isExclusiveStatus) {
      setContractFiles([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/requests/${req.id}/contract-files`, { cache: "no-store" });
        const payload = (await res.json().catch(() => null)) as CustomerContractFileListItem[] | { error?: string } | null;
        if (!res.ok || !Array.isArray(payload)) {
          if (!cancelled) setContractFiles([]);
          return;
        }
        if (!cancelled) setContractFiles(payload);
      } catch {
        if (!cancelled) setContractFiles([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isExclusiveStatus, req.id]);

  useEffect(() => {
    if (!isExclusiveStatus) {
      setDocRequests([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const payload = await fetchCustomerRequestDocumentRequests(req.id);
        if (!cancelled) setDocRequests(payload);
      } catch {
        if (!cancelled) setDocRequests([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isExclusiveStatus, req.id]);

  useEffect(() => {
    if (req.status !== "PROVIDER_SELECTED") return;

    let cancelled = false;
    const refreshIfWaitingForDocs = async () => {
      try {
        const payload = await fetchCustomerRequestDocumentRequests(req.id);
        if (!cancelled) setDocRequests(payload);
      } catch {
        // Keep current state.
      }
    };

    void refreshIfWaitingForDocs();
    const intervalId = window.setInterval(() => void refreshIfWaitingForDocs(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [req.id, req.status]);

  useEffect(() => {
    if (req.status !== "PROVIDER_SELECTED" || hasContractFiles) return;

    let cancelled = false;
    const refreshIfWaitingForContractFiles = async () => {
      try {
        const res = await fetch(`/api/requests/${req.id}/contract-files`, { cache: "no-store" });
        const payload = (await res.json().catch(() => null)) as CustomerContractFileListItem[] | { error?: string } | null;
        if (!cancelled && res.ok && Array.isArray(payload)) setContractFiles(payload);
      } catch {
        // Keep the current state; the regular page controls still show the waiting state.
      }
    };

    void refreshIfWaitingForContractFiles();
    const intervalId = window.setInterval(() => void refreshIfWaitingForContractFiles(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [hasContractFiles, req.id, req.status]);

  function canInitiateOrderFor(providerId: string) {
    if (isExclusiveStatus || req.status === "CLOSED") return false;
    if ((req.selectedProviderIds ?? []).includes(providerId)) return false;
    return true;
  }

  async function loadOffer() {
    setOfferBusy(true);
    setOfferError(null);
    try {
      const res = await fetch(`/api/public-offer/current`, { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as { error?: string } | { version: string; markdown: string } | null;
      if (!res.ok) {
        throw new Error(payload && typeof payload === "object" && "error" in payload ? payload.error ?? "Не удалось загрузить оферту" : "Не удалось загрузить оферту");
      }
      const data = payload as { version: string; markdown: string };
      setOfferVersion(data.version);
      setOfferMarkdown(data.markdown);
    } catch (e) {
      setOfferError(e instanceof Error ? e.message : "Не удалось загрузить оферту");
    } finally {
      setOfferBusy(false);
    }
  }

  async function acceptTerms() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/requests/${req.id}/accept-terms`, { method: "POST" });
      const payload = (await res.json().catch(() => null)) as { error?: string } | RequestCustomerDto | null;
      if (!res.ok) {
        throw new Error(payload && typeof payload === "object" && "error" in payload ? payload.error ?? "Не удалось согласовать условия" : "Не удалось согласовать условия");
      }
      setReq(payload as RequestCustomerDto);
      setNotice("Условия согласованы.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось согласовать условия");
    } finally {
      setBusy(false);
    }
  }

  async function selectProvider(providerId: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/requests/${req.id}/select-provider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | RequestCustomerDto | null;
      if (!res.ok) {
        throw new Error(payload && typeof payload === "object" && "error" in payload ? payload.error ?? "Не удалось выбрать исполнителя" : "Не удалось выбрать исполнителя");
      }
      setReq(payload as RequestCustomerDto);
      setNotice("Исполнитель выбран. Ожидайте договор.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось выбрать исполнителя");
    } finally {
      setBusy(false);
    }
  }

  async function uploadRequestedDocument(docRequestId: string, file: File) {
    setDocUploadBusy(true);
    setError(null);
    setNotice(null);
    try {
      await uploadCustomerRequestDocument(req.id, docRequestId, file);
      const next = await fetchCustomerRequestDocumentRequests(req.id);
      setDocRequests(next);
      setNotice("Документ загружен.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить документ");
    } finally {
      setDocUploadBusy(false);
    }
  }

  async function deleteRequestedDocument(docRequestId: string) {
    const ok = await confirm({
      title: "Удалить загруженный документ?",
      description: "Файл будет удалён. Если документ нужен снова — загрузите его повторно.",
      confirmText: "Удалить",
      confirmColor: "error",
    });
    if (!ok) return;
    setDocUploadBusy(true);
    setError(null);
    setNotice(null);
    try {
      await deleteCustomerRequestDocumentFile(req.id, docRequestId);
      const next = await fetchCustomerRequestDocumentRequests(req.id);
      setDocRequests(next);
      setNotice("Документ удалён.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить документ");
    } finally {
      setDocUploadBusy(false);
    }
  }

  async function acceptContract() {
    if (!offerVersion) {
      setOfferError("Версия оферты не загружена");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/requests/${req.id}/accept-contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerVersion }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { error?: string; code?: string; provider?: string }
        | RequestCustomerDto
        | null;
      if (!res.ok) {
        if (res.status === 403 && payload && typeof payload === "object" && "code" in payload && payload.code === "STEP_UP_REQUIRED") {
          const returnTo = `${window.location.pathname}${window.location.search}`;
          router.push(`/gosuslugi-mock?mode=verify&returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }
        throw new Error(payload && typeof payload === "object" && "error" in payload ? payload.error ?? "Не удалось заключить договор" : "Не удалось заключить договор");
      }
      setReq(payload as RequestCustomerDto);
      setNotice("Договор заключен.");
      setOfferOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось заключить договор");
    } finally {
      setBusy(false);
    }
  }

  function openOfferDialog() {
    setOfferAccepted(false);
    setOfferError(null);
    setOfferOpen(true);
    void loadOffer();
  }

  async function acceptResult() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/requests/${req.id}/accept-result`, { method: "POST" });
      const payload = (await res.json().catch(() => null)) as { error?: string } | unknown | null;
      if (!res.ok) {
        throw new Error(payload && typeof payload === "object" && payload && "error" in (payload as any) ? ((payload as any).error as string) : "Не удалось принять результат");
      }
      await refreshRequest();
      setNotice("Результат принят.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось принять результат");
    } finally {
      setBusy(false);
    }
  }

  async function sendRemarks() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/requests/${req.id}/send-remarks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const payload = (await res.json().catch(() => null)) as { error?: string } | unknown | null;
      if (!res.ok) {
        throw new Error(payload && typeof payload === "object" && payload && "error" in (payload as any) ? ((payload as any).error as string) : "Не удалось отправить замечания");
      }
      await refreshRequest();
      await loadRemarks().catch(() => null);
      setNotice("Замечания отправлены. Заявка возвращена в работу.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить замечания");
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
      await createCustomerRequestRemark(req.id, normalized);
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
      await completeCustomerRequestRemark(req.id, remarkId);
      await loadRemarks();
      setNotice("Замечание отмечено как выполненное.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отметить замечание выполненным");
    } finally {
      setBusy(false);
    }
  }

  const requestBody = resolveRequestDetailBody(req.message, req.serviceTitle);

  return (
    <ChatBodyWithSidePanelLayout
      middle={
        <Stack spacing={2}>
          <RequestDetailHeaderCard
            subtitle={pickTitle(req)}
            statusLabel={getRequestStatusLabel(req.status)}
            body={requestBody}
          />

          {notice ? <Alert severity="success">{notice}</Alert> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
          {remarksError ? <Alert severity="warning">{remarksError}</Alert> : null}

          <RequestDetails
            busy={busy}
            behavior={createCustomerRequestDetailsBehavior({
              request: req,
              canAcceptContract,
              remarks,
              actions: {
                openOfferDialog,
                acceptResult,
                sendRemarks,
                remarkAdd,
                remarkComplete,
              },
            })}
          />

          <CustomerRequestDocumentsSection
            open={isExclusiveStatus}
            request={req}
            busy={busy}
            docUploadBusy={docUploadBusy}
            contractFiles={contractFiles}
            docRequests={docRequests}
            allRequestedDocumentsUploaded={allRequestedDocumentsUploaded}
            hasRevisionRequested={hasRevisionRequested}
            hasPending={hasPending}
            hasContractFiles={hasContractFiles}
            canAcceptContract={canAcceptContract}
            onDeleteRequestedDocument={deleteRequestedDocument}
            onUploadRequestedDocument={uploadRequestedDocument}
            onOpenOfferDialog={openOfferDialog}
            onContractFilesChange={setContractFiles}
          />

          <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography fontWeight={800}>Чаты с компаниями</Typography>
              <Typography variant="body2" color="text.secondary">
                Выберите компанию, чтобы продолжить диалог.
              </Typography>
            </Box>
            <Divider />
            {conversations.length === 0 ? (
              <Box sx={{ p: 2 }}>
                <Typography color="text.secondary">Пока никто не написал.</Typography>
              </Box>
            ) : (
              <List dense disablePadding>
                {conversations.map((c) => {
                  const isSelected = (req.selectedProviderIds ?? []).includes(c.providerId);
                  const isDeclined = (req.declinedProviderIds ?? []).includes(c.providerId);
                  const rowCanInitiate = isSelected ? true : canInitiateOrderFor(c.providerId);
                  const isChosenProvider = req.status === "PROVIDER_SELECTED" && req.providerId === c.providerId;

                  return (
                    <ListItem
                      key={c.conversationId}
                      disablePadding
                      secondaryAction={
                        req.status === "CLOSED" ? null : req.status === "PROVIDER_SELECTED" ? (
                          isChosenProvider ? (
                            <Stack direction="row" spacing={1} sx={{ pr: 1 }}>
                              <Button size="small" variant="outlined" disabled sx={{ whiteSpace: "nowrap" }}>
                                {hasContractFiles ? "Договор прикреплён" : "Ожидаем договор"}
                              </Button>
                            </Stack>
                          ) : null
                        ) : isExclusiveStatus ? null : (
                          <Stack direction="row" spacing={1} sx={{ pr: 1 }}>
                            <Button
                              color="secondary"
                              size="small"
                              variant="contained"
                              disabled={!rowCanInitiate || busy}
                              onClick={(e) => {
                                e.stopPropagation();
                                void selectProvider(c.providerId);
                              }}
                              sx={{ whiteSpace: "nowrap" }}
                            >
                              {isDeclined ? "Запросить снова" : "Заключить договор"}
                            </Button>
                          </Stack>
                        )
                      }
                    >
                      <ListItemButton
                        selected={c.conversationId === selectedConversationId}
                        onClick={() => setSelectedConversationId(c.conversationId)}
                        sx={{
                          "&.Mui-selected": { bgcolor: "action.selected" },
                          "&.Mui-selected:hover": { bgcolor: "action.selected" },
                        }}
                      >
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                              <Typography component="span" fontWeight={c.conversationId === selectedConversationId ? 800 : 700}>
                                {c.providerName}
                              </Typography>
                              {isSelected ? <Chip size="small" label="Выбрано" /> : null}
                              {!isSelected && isDeclined ? <Chip size="small" variant="outlined" label="Отказ" /> : null}
                            </Stack>
                          }
                          secondary={c.lastSnippet ?? "—"}
                          secondaryTypographyProps={{ noWrap: true }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Paper>

          <Dialog
            open={offerOpen}
            onClose={() => {
              if (!busy) setOfferOpen(false);
            }}
            fullWidth
            maxWidth="md"
          >
            <DialogTitle>Публичная оферта</DialogTitle>
            <DialogContent dividers>
              {offerError ? <Alert severity="error">{offerError}</Alert> : null}
              {offerBusy ? <Typography color="text.secondary">Загрузка…</Typography> : null}
              {!offerBusy && offerMarkdown ? (
                <Typography sx={{ whiteSpace: "pre-wrap" }}>{offerMarkdown}</Typography>
              ) : null}
              <FormControlLabel
                control={<Checkbox checked={offerAccepted} onChange={(e) => setOfferAccepted(e.target.checked)} />}
                label={
                  offerVersion
                    ? `Я согласен(на) с офертой версии ${offerVersion} и условиями договора`
                    : "Я согласен(на) с офертой и условиями договора"
                }
                sx={{ mt: 2 }}
              />
            </DialogContent>
            <DialogActions>
              <Button disabled={busy} onClick={() => setOfferOpen(false)}>
                Отмена
              </Button>
              <Button
                variant="contained"
                color="success"
                disabled={busy || offerBusy || !offerAccepted || !offerVersion}
                onClick={() => void acceptContract()}
              >
                Подтвердить акцепт
              </Button>
            </DialogActions>
          </Dialog>
        </Stack>
      }
      right={
        selectedConversationId ? (
          <ServiceRequestChatPanel
            serviceRequestId={req.id}
            conversationId={selectedConversationId}
            title="Чат"
            subtitle={selectedConversation?.providerName ?? pickTitle(req)}
          />
        ) : (
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography color="text.secondary">Выберите чат слева.</Typography>
          </Paper>
        )
      }
    />
  );
}
