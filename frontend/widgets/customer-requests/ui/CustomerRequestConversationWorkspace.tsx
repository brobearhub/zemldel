"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  hasRequestLock,
  isOrderExecutionStatus,
  mergeWorkStageStatusOptions,
  resolveRequestDetailBody,
  type RequestDocumentRequestDto,
  type RequestRemarkDto,
  type RequestCustomerDto,
  type WorkStageDto,
  type WorkStageStatusOptionDto,
} from "@/entities/request";
import {
  completeCustomerRequestRemark,
  createCustomerRequestRemark,
  fetchCustomerRequestRemarks,
} from "@/entities/request/api/request-remarks";
import { fetchCustomerWorkStages } from "@/entities/request/api/request-work-stages";
import { ChatBodyWithSidePanelLayout } from "@/widgets/chat/ui/ChatBodyWithSidePanelLayout";
import { ServiceRequestChatPanel } from "@/widgets/chat/ui/ServiceRequestChatPanel";
import Link from "@/shared/ui/Link";
import { RequestDetailHeaderCard } from "@/shared/ui/RequestDetailHeaderCard";
import { createCustomerRequestDetailsBehavior, RequestDetails } from "@/widgets/request-details";
import {
  createCustomerRequestLifecycleBehavior,
  RequestLifecycleActions,
} from "@/widgets/request-lifecycle-actions";
import {
  createCustomerRequestRemarksBehavior,
  RequestRemarks,
} from "@/widgets/request-remarks";
import { RequestWorkProgress } from "@/widgets/request-work-progress";
import { RequestPayments } from "@/widgets/request-payments";
import { RequestDetailPanelLayer } from "@/shared/ui/RequestDetailPanelLayer";
import { RequestDetailPanelTriggers } from "@/shared/ui/RequestDetailPanelTriggers";
import {
  fetchCustomerRequestDocumentRequests,
  uploadCustomerRequestDocument,
  deleteCustomerRequestDocumentFile,
} from "@/entities/request/api/request-document-requests";
import type { CustomerContractBundleListItem } from "@/features/request-contract-files/ui/CustomerRequestContractFilesClient";
import { canCustomerAcceptContract } from "@/widgets/customer-requests/lib/can-accept-contract";
import { CustomerRequestDocumentsSection } from "@/widgets/customer-requests/ui/CustomerRequestDocumentsSection";
import { useConfirm } from "@/shared/ui/confirm";
import {
  canShowCustomerCounterpartyButton,
  getProviderContactFields,
  RequestCounterpartyPanel,
} from "@/features/request-counterparty";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import CurrencyRubleIcon from "@mui/icons-material/CurrencyRuble";

function pickTitle(req: RequestCustomerDto) {
  if (req.subjectType === "SERVICE") return req.serviceTitle ?? "Заявка по услуге";
  if (req.subjectType === "CATEGORY") return "Заявка по категории";
  return "Свободная заявка";
}

type Props = {
  initialRequest: RequestCustomerDto;
};

export function CustomerRequestConversationWorkspace({ initialRequest }: Props) {
  const [req, setReq] = useState<RequestCustomerDto>(initialRequest);
  const [conversations, setConversations] = useState<ChatServiceRequestConversationListItemDto[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [contractBundles, setContractBundles] = useState<CustomerContractBundleListItem[]>([]);
  const [docRequests, setDocRequests] = useState<RequestDocumentRequestDto[]>([]);
  const [docUploadBusy, setDocUploadBusy] = useState(false);
  const [remarks, setRemarks] = useState<RequestRemarkDto[]>([]);
  const [remarksError, setRemarksError] = useState<string | null>(null);
  const [workStages, setWorkStages] = useState<WorkStageDto[]>([]);
  const [workStageStatusOptions] = useState<WorkStageStatusOptionDto[]>(
    mergeWorkStageStatusOptions([])
  );
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [activePanelId, setActivePanelId] = useState<"payment" | "counterparty" | null>(null);
  const [termsBusy, setTermsBusy] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [termsVersion, setTermsVersion] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
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

  const loadWorkStages = useCallback(async () => {
    if (
      req.status !== "ACTIVE" &&
      req.status !== "ACCEPTANCE_PENDING" &&
      req.status !== "ACCEPTED" &&
      req.status !== "COMPLETED"
    ) {
      setWorkStages([]);
      return;
    }
    setWorkStages(await fetchCustomerWorkStages(req.id));
  }, [req.id, req.status]);

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
    let cancelled = false;
    (async () => {
      try {
        await loadWorkStages();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить этапы работ");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadWorkStages]);

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
  const isExclusiveStatus = hasRequestLock(req);
  const hasContractBundles = contractBundles.length > 0;
  const hasApprovedContractBundle = contractBundles.some((b) => b.status === "APPROVED" && Boolean(b.signature));
  const hasRevisionRequested = contractBundles.some((b) => b.status === "REVISION_REQUESTED");
  const hasPending = contractBundles.some((b) => b.status === "PENDING_CUSTOMER");
  const allRequestedDocumentsUploaded = docRequests.every((d) => d.status === "UPLOADED");
  const canAcceptContract = canCustomerAcceptContract({
    requestStatus: req.status,
    lockedAt: req.lockedAt,
    contractBundles,
    documentRequests: docRequests,
  });

  useEffect(() => {
    if (!isExclusiveStatus) {
      setContractBundles([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/requests/${req.id}/contract-bundles`, { cache: "no-store" });
        const payload = (await res.json().catch(() => null)) as CustomerContractBundleListItem[] | { error?: string } | null;
        if (!res.ok || !Array.isArray(payload)) {
          if (!cancelled) setContractBundles([]);
          return;
        }
        if (!cancelled) setContractBundles(payload);
      } catch {
        if (!cancelled) setContractBundles([]);
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
    if (!hasRequestLock(req)) return;

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
  }, [req.id, req.lockedAt]);

  useEffect(() => {
    if (!hasRequestLock(req) || hasContractBundles) return;

    let cancelled = false;
    const refreshIfWaitingForContractFiles = async () => {
      try {
        const res = await fetch(`/api/requests/${req.id}/contract-bundles`, { cache: "no-store" });
        const payload = (await res.json().catch(() => null)) as CustomerContractBundleListItem[] | { error?: string } | null;
        if (!cancelled && res.ok && Array.isArray(payload)) setContractBundles(payload);
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
  }, [hasContractBundles, req.id, req.status]);

  function canInitiateOrderFor(providerId: string) {
    if (isExclusiveStatus || req.status === "CLOSED") return false;
    if ((req.selectedProviderIds ?? []).includes(providerId)) return false;
    return true;
  }

  async function loadTermsVersion() {
    setTermsBusy(true);
    setTermsError(null);
    try {
      const res = await fetch(`/api/legal-docs/terms/current`, { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as
        | { error?: string }
        | { version: string }
        | null;
      if (!res.ok || !payload || typeof payload !== "object" || !("version" in payload) || !payload.version) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? payload.error ?? "Не удалось загрузить соглашение"
            : "Не удалось загрузить соглашение",
        );
      }
      setTermsVersion(payload.version);
    } catch (e) {
      setTermsError(e instanceof Error ? e.message : "Не удалось загрузить соглашение");
    } finally {
      setTermsBusy(false);
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

  function extractAcceptContractError(payload: unknown) {
    if (!payload || typeof payload !== "object") return "Не удалось заключить договор";
    const record = payload as { error?: unknown; message?: unknown };
    const raw =
      typeof record.error === "string" && record.error.trim()
        ? record.error
        : typeof record.message === "string" && record.message.trim()
          ? record.message
          : Array.isArray(record.message) && typeof record.message[0] === "string"
            ? record.message[0]
            : null;
    if (!raw) return "Не удалось заключить договор";
    if (/all contract bundles must be approved/i.test(raw)) {
      return "Одобрите все пакеты договора.";
    }
    if (/approved contract bundle/i.test(raw)) {
      return "Нужен одобренный пакет договора с файлом подписи.";
    }
    if (/requested documents/i.test(raw)) {
      return "Загрузите все запрошенные документы.";
    }
    return raw;
  }

  async function acceptContract() {
    if (!termsVersion) {
      setTermsError("Версия пользовательского соглашения не загружена");
      return;
    }
    setBusy(true);
    setError(null);
    setTermsError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/requests/${req.id}/accept-contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termsVersion }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { error?: string; message?: string }
        | RequestCustomerDto
        | null;
      if (!res.ok) {
        throw new Error(extractAcceptContractError(payload));
      }
      setReq(payload as RequestCustomerDto);
      setNotice("Договор заключен.");
      setContractDialogOpen(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Не удалось заключить договор";
      setTermsError(message);
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  function openContractDialog() {
    setTermsAccepted(false);
    setTermsError(null);
    setContractDialogOpen(true);
    void loadTermsVersion();
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

  async function sendRemarks(text: string) {
    const normalized = text.trim();
    if (normalized.length < 3) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/requests/${req.id}/send-remarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks: normalized }),
      });
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
  const showCounterparty = canShowCustomerCounterpartyButton({ lockedAt: req.lockedAt });
  const showPayment = req.lockedAt != null;
  const providerFields = getProviderContactFields({
    providerName: req.providerName,
    providerPhone: req.providerPhone,
    providerEmail: req.providerEmail,
  });

  const panelItems = [
    { id: "payment", label: "Оплата", visible: showPayment, endIcon: <CurrencyRubleIcon /> },
    { id: "counterparty", label: "Исполнитель", visible: showCounterparty, endIcon: <AssignmentIndIcon /> },
  ] as const;

  const activePanel = panelItems.find((p) => p.id === activePanelId && p.visible);
  const isPanelOpen = Boolean(activePanel);
  const panelTitle = activePanel?.id === "payment" ? "Оплата" : "Исполнитель";
  const panelIcon = activePanel?.id === "payment" ? <CurrencyRubleIcon /> : <AssignmentIndIcon />;
  const panelContent =
    activePanel?.id === "payment" ? (
      <RequestPayments
        mode="customer"
        requestId={req.id}
        status={req.status}
        lockedAt={req.lockedAt}
        totalAmountKopecks={req.totalAmountKopecks}
        paidAmountKopecks={req.paidAmountKopecks}
        remainingAmountKopecks={req.remainingAmountKopecks}
        payments={req.payments}
        busy={busy}
        onChanged={refreshRequest}
      />
    ) : (
      <RequestCounterpartyPanel fields={providerFields} avatarSrc={req.providerImage} avatarName={req.providerName} />
    );

  return (
    <ChatBodyWithSidePanelLayout
      middle={
        <Stack spacing={2}>
          <RequestDetailPanelLayer
            open={isPanelOpen}
            title={panelTitle}
            icon={panelIcon}
            panel={panelContent}
            onClose={() => setActivePanelId(null)}
          >
            <RequestDetailHeaderCard
              subtitle={pickTitle(req)}
              statusLabel={getRequestStatusLabel(req.status)}
              body={requestBody}
              footerEnd={<RequestDetailPanelTriggers items={panelItems} onOpen={(id) => setActivePanelId(id as never)} />}
              details={
                <RequestDetails
                  busy={busy}
                  behavior={createCustomerRequestDetailsBehavior({
                    request: req,
                    canAcceptContract,
                  })}
                />
              }
              afterBody={
                <RequestLifecycleActions
                  busy={busy}
                  behavior={createCustomerRequestLifecycleBehavior({
                    request: req,
                    canAcceptContract,
                    actions: {
                      openOfferDialog: openContractDialog,
                      acceptResult,
                    },
                  })}
                />
              }
            />
          </RequestDetailPanelLayer>

          {notice ? <Alert severity="success">{notice}</Alert> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
          {remarksError ? <Alert severity="warning">{remarksError}</Alert> : null}

          <RequestWorkProgress
            mode="customer"
            requestId={req.id}
            requestStatus={req.status}
            stages={workStages}
            statusOptions={workStageStatusOptions}
            busy={busy}
            onRefresh={loadWorkStages}
            onError={(message) => setError(message)}
          />

          <RequestRemarks
            busy={busy}
            behavior={createCustomerRequestRemarksBehavior({
              request: req,
              remarks,
              actions: {
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
            contractBundles={contractBundles}
            docRequests={docRequests}
            allRequestedDocumentsUploaded={allRequestedDocumentsUploaded}
            hasRevisionRequested={hasRevisionRequested}
            hasPending={hasPending}
            hasContractBundles={hasContractBundles}
            canAcceptContract={canAcceptContract}
            onDeleteRequestedDocument={deleteRequestedDocument}
            onUploadRequestedDocument={uploadRequestedDocument}
            onOpenOfferDialog={openContractDialog}
            onContractBundlesChange={setContractBundles}
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
                  const isChosenProvider = hasRequestLock(req) && req.providerId === c.providerId;

                  return (
                    <ListItem
                      key={c.conversationId}
                      disablePadding
                      secondaryAction={
                        req.status === "CLOSED" ? null : hasRequestLock(req) ? (
                          isChosenProvider ? (
                            <Stack direction="row" spacing={1} sx={{ pr: 1 }}>
                              <Button size="small" variant="outlined" disabled sx={{ whiteSpace: "nowrap" }}>
                                {hasContractBundles ? "Договор прикреплён" : "Ожидаем договор"}
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
            open={contractDialogOpen}
            onClose={() => {
              if (!busy) setContractDialogOpen(false);
            }}
            fullWidth
            maxWidth="md"
          >
            <DialogTitle>Заключение договора</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={1.5}>
                <Typography variant="body2" color="text.secondary">
                  Договор заключается напрямую между вами и исполнителем (по согласованным условиям
                  сделки и файлам договора). Платформа стороной этого договора не является — см.{" "}
                  <Box
                    component="a"
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ fontWeight: 700, color: "inherit" }}
                  >
                    пользовательское соглашение
                  </Box>
                  {termsVersion ? ` (версия ${termsVersion})` : ""}.
                </Typography>
                {termsError ? <Alert severity="error">{termsError}</Alert> : null}
                {termsBusy ? <Typography color="text.secondary">Загрузка версии соглашения…</Typography> : null}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                    />
                  }
                  label="Я согласен(а) с договором исполнителя и пользовательским соглашением платформы"
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button disabled={busy} onClick={() => setContractDialogOpen(false)}>
                Отмена
              </Button>
              <Button
                variant="contained"
                color="success"
                disabled={busy || termsBusy || !termsAccepted || !termsVersion}
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
