"use client";
import { RequestAssignee } from "@/widgets/provider-team/RequestAssignee";
import {
  RequestUnavailableNotice,
  isRequestAccessFailure,
  type RequestAccessFailure,
} from "@/shared/ui/RequestUnavailableNotice";
import { extractAcceptContractError } from "../lib/contract-acceptance-error";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useCabinetSidebar } from "@/shared/ui/CabinetSidebarContext";
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
import { RequestCityInactiveWarning } from "@/shared/ui/RequestCityInactiveWarning";
import {
  ensureCustomerRequestConversation,
  fetchCustomerRequestConversations,
  type ChatServiceRequestConversationListItemDto,
} from "@/entities/chat";
import {
  getRequestDisplayStatusLabel,
  formatRequestReference,
  hasRequestLock,
  isOrderExecutionStatus,
  mergeWorkStageStatusOptions,
  formatRubles,
  RequestPriceBlock,
  resolvePaymentTriggerLabel,
  resolveProviderTriggerLabel,
  resolveRequestDetailBody,
  resolveRequestDetailTitle,
  resolveRequestPriceView,
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
import {
  createCustomerRequestDetailsBehavior,
  RequestDetails,
} from "@/widgets/request-details";
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
import { RequestReviewsPanel } from "@/widgets/request-reviews";
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
import { useConfirm, useConfirmWithReason } from "@/shared/ui/confirm";
import { getConversationWorkspaceCopy } from "@/widgets/customer-requests/lib/conversation-workspace-copy";
import {
  canShowCustomerCounterpartyButton,
  getProviderContactFields,
  RequestCounterpartyPanel,
} from "@/features/request-counterparty";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import PaymentIcon from "@mui/icons-material/Payment";
import PinDropOutlinedIcon from "@mui/icons-material/PinDropOutlined";
import {
  cancelCustomerRequestProviderSelection,
  deleteCustomerRequest,
} from "@/entities/request/api/customer-requests";
import {
  appendCustomerCadastralNumber,
  deleteCustomerCadastralNumber,
  updateCustomerCadastralNumber,
} from "@/entities/request/api/request-cadastral-numbers";
import {
  createRequestCadastralBehavior,
  RequestCadastralNumbers,
} from "@/widgets/request-cadastral-numbers";
import {
  resolveActiveConversationId,
  resolveProviderSelectionVisibility,
} from "@/widgets/customer-requests/model/conversation-selection";
import {
  retrySelectedProviderConversation,
  selectProviderAndPrepareConversation,
  type SelectedProviderChatResult,
} from "@/features/select-request-provider";
import {
  fetchCustomerRequestFinance,
  type RequestFinanceDto,
} from "@/entities/request/api/request-payments";
import { useVisibleRefresh } from "@/shared/lib/use-visible-refresh";
import { createLatestFinanceRequestRunner } from "../model/latest-finance-request";

function pickTitle(req: RequestCustomerDto) {
  if (req.subjectType === "SERVICE")
    return req.serviceTitle ?? "Заявка по услуге";
  if (req.subjectType === "CATEGORY") return "Заявка по категории";
  return "Свободная заявка";
}

type Props = {
  initialRequest: RequestCustomerDto;
  justCreated?: boolean;
  initialConversationId?: string;
};

type ChatRecovery = Extract<
  SelectedProviderChatResult,
  { kind: "recovery-required" }
>;

export function CustomerRequestConversationWorkspace({
  initialRequest,
  justCreated = false,
  initialConversationId,
}: Props) {
  const router = useRouter();
  const { expanded: sidebarExpanded, collapseSidebar } = useCabinetSidebar();
  const wide = useMediaQuery((theme) => theme.breakpoints.up("tablet"));
  const [chatCollapsed, setChatCollapsed] = useState(false);
  useEffect(() => { setChatCollapsed(sidebarExpanded); }, [sidebarExpanded]);
  const [unavailable, setUnavailable] = useState<RequestAccessFailure | null>(
    null,
  );
  const documentsRef = useRef<HTMLDivElement>(null);
  const [req, setReq] = useState<RequestCustomerDto>(initialRequest);
  const [finance, setFinance] = useState<RequestFinanceDto>({
    totalAmountRubles: initialRequest.lockedAt
      ? initialRequest.totalAmountRubles
      : null,
    priceProposal: initialRequest.lockedAt
      ? (initialRequest.priceProposal ?? null)
      : null,
    canProposePrice: initialRequest.lockedAt
      ? initialRequest.canProposePrice
      : false,
    canAcceptPrice: initialRequest.lockedAt
      ? initialRequest.canAcceptPrice
      : false,
    paidAmountRubles: initialRequest.lockedAt
      ? initialRequest.paidAmountRubles
      : 0,
    remainingAmountRubles: initialRequest.lockedAt
      ? initialRequest.remainingAmountRubles
      : null,
    payments: initialRequest.lockedAt ? initialRequest.payments : [],
  });
  const financeRequestRunner = useRef(
    createLatestFinanceRequestRunner<RequestFinanceDto>(setFinance),
  );
  const [conversations, setConversations] = useState<
    ChatServiceRequestConversationListItemDto[]
  >([]);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [chatRecovery, setChatRecovery] = useState<ChatRecovery | null>(null);
  const [busy, setBusy] = useState(false);
  const [contractDecisionBusy, setContractDecisionBusy] = useState(false);
  const [paymentsBusy, setPaymentsBusy] = useState(false);
  const [progressBusy, setProgressBusy] = useState(false);
  /** Какая кнопка этого экрана запустила запрос: спиннер только на ней. */
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [contractBundles, setContractBundles] = useState<
    CustomerContractBundleListItem[]
  >([]);
  const [docRequests, setDocRequests] = useState<RequestDocumentRequestDto[]>(
    [],
  );
  const [docUploadBusy, setDocUploadBusy] = useState(false);
  const [remarks, setRemarks] = useState<RequestRemarkDto[]>([]);
  const [remarksError, setRemarksError] = useState<string | null>(null);
  const [workStages, setWorkStages] = useState<WorkStageDto[]>([]);
  const [workStageStatusOptions] = useState<WorkStageStatusOptionDto[]>(
    mergeWorkStageStatusOptions([]),
  );
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [activePanelId, setActivePanelId] = useState<
    "payment" | "counterparty" | "cadastral" | null
  >(null);
  const [termsBusy, setTermsBusy] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [termsVersion, setTermsVersion] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const syncPaused =
    busy ||
    docUploadBusy ||
    contractDecisionBusy ||
    paymentsBusy ||
    progressBusy;
  const confirm = useConfirm();
  const confirmWithReason = useConfirmWithReason();

  const selectedConversation = useMemo(
    () =>
      conversations.find((c) => c.conversationId === selectedConversationId) ??
      null,
    [conversations, selectedConversationId],
  );

  const refreshFinance = useCallback(async () => {
    if (!req.lockedAt && !selectedConversationId) {
      financeRequestRunner.current.cancel();
      return;
    }
    const conversationId = req.lockedAt
      ? undefined
      : (selectedConversationId ?? undefined);
    const financeKey = req.lockedAt
      ? `provider:${req.providerId ?? "missing"}`
      : `conversation:${selectedConversationId}`;
    await financeRequestRunner.current.run(financeKey, (signal) =>
      fetchCustomerRequestFinance(req.id, conversationId, signal),
    );
  }, [req.id, req.lockedAt, req.providerId, selectedConversationId]);

  useEffect(() => {
    if (syncPaused || req.lockedAt) return;
    void refreshFinance().catch((financeError: unknown) => {
      setError(
        financeError instanceof Error
          ? financeError.message
          : "Не удалось загрузить оплату",
      );
    });
    const runner = financeRequestRunner.current;
    return () => runner.cancel();
  }, [refreshFinance, req.lockedAt, syncPaused]);

  useEffect(
    () => () => {
      financeRequestRunner.current.cancel();
    },
    [],
  );

  const loadConversations = useCallback(async () => {
    return fetchCustomerRequestConversations(req.id);
  }, [req.id]);

  const ensureServiceChat = useCallback(async () => {
    if (req.subjectType !== "SERVICE") return;
    if (!req.providerId) {
      setError("Не удалось открыть чат: у заявки нет исполнителя.");
      return;
    }

    setBusy(true);
    setPendingAction("chat");
    setError(null);
    try {
      const ensured = await ensureCustomerRequestConversation(req.id);
      const providerName = req.providerName ?? "Исполнитель";
      const nextItem: ChatServiceRequestConversationListItemDto = {
        conversationId: ensured.conversationId,
        providerId: req.providerId,
        providerName,
        lastMessageAt: null,
        lastSnippet: null,
      };

      setConversations([nextItem]);
      setSelectedConversationId(ensured.conversationId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось открыть чат");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }, [req.id, req.providerId, req.providerName, req.subjectType]);

  const refreshRequest = useCallback(async () => {
    const res = await fetch(`/api/requests/${req.id}`, { cache: "no-store" });
    const payload = (await res.json().catch(() => null)) as
      | RequestCustomerDto
      | { error?: string }
      | null;
    if (!res.ok) {
      throw new Error(
        payload &&
          typeof payload === "object" &&
          "error" in payload &&
          payload.error
          ? payload.error
          : "Не удалось обновить заявку",
      );
    }
    setReq(payload as RequestCustomerDto);
  }, [req.id]);

  useEffect(() => {
    // Do not show documents or execution details from a previous provider scope.
    setContractBundles([]);
    setDocRequests([]);
    setWorkStages([]);
    setRemarks([]);
    setRemarksError(null);
  }, [req.providerId, req.lockedAt]);

  useVisibleRefresh({
    requestId: req.id,
    refreshAt: req.status === "ACCEPTANCE_PENDING" ? req.autoAcceptAt : null,
    scope: `${req.id}:${req.providerId}:${req.lockedAt}:${selectedConversationId}`,
    paused: syncPaused || unavailable !== null,
    onRefresh: async (signal) => {
      const response = await fetch(`/api/requests/${req.id}`, {
        cache: "no-store",
        signal,
      });
      if (isRequestAccessFailure(response.status)) {
        if (!signal.aborted) setUnavailable(response.status);
        return;
      }
      const next = (await response.json()) as RequestCustomerDto;
      if (!response.ok || !next?.id || signal.aborted) return;
      const exclusive = hasRequestLock(next);
      const executing = isOrderExecutionStatus(next.status);
      const [chats, bundles, documents, stages, nextRemarks] =
        await Promise.allSettled([
          loadConversations(),
          exclusive
            ? fetch(`/api/requests/${req.id}/contract-bundles`, {
                cache: "no-store",
                signal,
              }).then(async (res) => {
                if (!res.ok) throw new Error("Не удалось загрузить договоры");
                return (await res.json()) as CustomerContractBundleListItem[];
              })
            : Promise.resolve([]),
          exclusive
            ? fetchCustomerRequestDocumentRequests(req.id)
            : Promise.resolve([]),
          ["ACTIVE", "ACCEPTANCE_PENDING", "ACCEPTED", "COMPLETED"].includes(
            next.status,
          )
            ? fetchCustomerWorkStages(req.id)
            : Promise.resolve([]),
          executing ? fetchCustomerRequestRemarks(req.id) : Promise.resolve([]),
        ]);
      if (signal.aborted) return;
      // Commit one cycle together; events received during it queue a follow-up read.
      if (next.status !== req.status) setNotice(null);
      setReq(next);
      if (chats.status === "fulfilled") {
        setConversations(chats.value);
        setConversationsLoaded(true);
      }
      if (bundles.status === "fulfilled") setContractBundles(bundles.value);
      if (documents.status === "fulfilled") setDocRequests(documents.value);
      if (stages.status === "fulfilled") setWorkStages(stages.value);
      if (nextRemarks.status === "fulfilled") {
        setRemarks(nextRemarks.value);
        setRemarksError(null);
      }
      // The request DTO already contains finance for the selected deal.
      if (next.lockedAt) setFinance(next);
      else if (selectedConversationId) {
        const value = await fetchCustomerRequestFinance(
          req.id,
          selectedConversationId,
          signal,
        );
        if (!signal.aborted) setFinance(value);
      }
    },
  });

  const loadRemarks = useCallback(async () => {
    const list = await fetchCustomerRequestRemarks(req.id);
    setRemarks(list);
  }, [req.id]);

  const loadWorkStages = useCallback(
    async (isCurrent = () => true) => {
      if (
        req.status !== "ACTIVE" &&
        req.status !== "ACCEPTANCE_PENDING" &&
        req.status !== "ACCEPTED" &&
        req.status !== "COMPLETED"
      ) {
        setWorkStages([]);
        return;
      }
      const stages = await fetchCustomerWorkStages(req.id);
      if (isCurrent()) setWorkStages(stages);
    },
    [req.id, req.status],
  );

  const conversationSelectionScope = `${req.id}:${req.providerId}:${req.lockedAt}`;
  const previousSelectionScope = useRef<string | null>(null);
  const appliedInitialConversation = useRef(false);
  useEffect(() => {
    if (!conversationsLoaded) return;
    const scopeChanged =
      previousSelectionScope.current !== conversationSelectionScope;
    previousSelectionScope.current = conversationSelectionScope;
    const requestedConversationId = appliedInitialConversation.current
      ? undefined
      : initialConversationId;
    appliedInitialConversation.current = true;
    setSelectedConversationId((currentConversationId) =>
      resolveActiveConversationId({
        conversations,
        requestedConversationId,
        currentConversationId,
        lockedAt: req.lockedAt,
        selectedProviderId: req.providerId,
        preferSelectedProvider: scopeChanged,
      }),
    );
  }, [
    conversations,
    conversationsLoaded,
    conversationSelectionScope,
    req.lockedAt,
    req.providerId,
    initialConversationId,
  ]);

  const activeOffer =
    req.offers.find(
      (offer) => offer.providerId === selectedConversation?.providerId,
    ) ??
    req.offers.find((offer) =>
      req.selectedProviderIds.includes(offer.providerId),
    ) ??
    null;

  const isExecutionStatus = isOrderExecutionStatus(req.status);
  const isExclusiveStatus = hasRequestLock(req);
  const isServiceRequest = req.subjectType === "SERVICE";
  const conversationCopy = getConversationWorkspaceCopy(req.subjectType);
  const hasContractBundles = contractBundles.length > 0;
  const hasRevisionRequested = contractBundles.some(
    (b) => b.status === "REVISION_REQUESTED",
  );
  const hasPending = contractBundles.some(
    (b) => b.status === "PENDING_CUSTOMER",
  );
  const allRequestedDocumentsUploaded = docRequests.every(
    (d) => d.status === "UPLOADED",
  );
  const canAcceptContract = canCustomerAcceptContract({
    requestStatus: req.status,
    lockedAt: req.lockedAt,
    totalAmountRubles: finance.totalAmountRubles,
    contractBundles,
    documentRequests: docRequests,
  });

  useEffect(() => {
    if (contractDialogOpen && !canAcceptContract) setTermsAccepted(false);
  }, [contractDialogOpen, canAcceptContract]);

  function canInitiateOrderFor(providerId: string) {
    if (isExclusiveStatus || req.status === "CLOSED") return false;
    if ((req.selectedProviderIds ?? []).includes(providerId)) return false;
    return true;
  }

  async function loadTermsVersion() {
    setTermsBusy(true);
    setTermsError(null);
    try {
      const res = await fetch(`/api/legal-docs/terms/current`, {
        cache: "no-store",
      });
      const payload = (await res.json().catch(() => null)) as
        | { error?: string }
        | { version: string }
        | null;
      if (
        !res.ok ||
        !payload ||
        typeof payload !== "object" ||
        !("version" in payload) ||
        !payload.version
      ) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? (payload.error ?? "Не удалось загрузить соглашение")
            : "Не удалось загрузить соглашение",
        );
      }
      setTermsVersion(payload.version);
    } catch (e) {
      setTermsError(
        e instanceof Error ? e.message : "Не удалось загрузить соглашение",
      );
    } finally {
      setTermsBusy(false);
    }
  }

  async function acceptTerms() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/requests/${req.id}/accept-terms`, {
        method: "POST",
      });
      const payload = (await res.json().catch(() => null)) as
        | { error?: string }
        | RequestCustomerDto
        | null;
      if (!res.ok) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? (payload.error ?? "Не удалось согласовать условия")
            : "Не удалось согласовать условия",
        );
      }
      setReq(payload as RequestCustomerDto);
      setNotice("Условия согласованы.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось согласовать условия",
      );
    } finally {
      setBusy(false);
    }
  }

  async function selectProvider(providerId: string, providerName: string) {
    const ok = await confirm({
      title: `Выбрать «${providerName}» исполнителем?`,
      description:
        "Остальные компании получат отказ, переписка с ними сохранится. До заключения договора вы сможете отменить выбор и вернуться к откликам.",
      confirmText: "Выбрать",
      confirmColor: "success",
    });
    if (!ok) return;
    setBusy(true);
    setPendingAction(`select:${providerId}`);
    setError(null);
    setNotice(null);
    try {
      const result = await selectProviderAndPrepareConversation({
        requestId: req.id,
        providerId,
        providerName,
        previousConversations: conversations,
        onProviderSelected: (nextRequest) => {
          setReq(nextRequest);
          // Server уже зафиксировал B: A немедленно перестаёт быть активным.
          setSelectedConversationId(null);
          setChatRecovery(null);
        },
      });
      if (result.chat.kind === "ready") {
        setConversations(result.chat.conversations);
        setSelectedConversationId(result.chat.selectedConversationId);
        setChatRecovery(null);
      } else {
        setChatRecovery(result.chat);
      }
      setNotice(
        `Вы выбрали «${providerName}». Исполнитель пришлёт договор — вы сможете проверить его перед заключением.`,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось выбрать исполнителя",
      );
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function cancelProviderSelection() {
    const reason = await confirmWithReason({
      title: "Отменить выбор исполнителя?",
      description:
        "Договор ещё не заключён. Текущая цена перестанет действовать, а другие отклики снова можно будет выбрать.",
      reasonLabel: "Причина для исполнителя",
      confirmText: "Отменить выбор",
      confirmColor: "warning",
    });
    if (reason === null) return;
    setBusy(true);
    setPendingAction("cancel-selection");
    setError(null);
    setNotice(null);
    try {
      const next = await cancelCustomerRequestProviderSelection(req.id, reason);
      setReq(next);
      setChatRecovery(null);
      setSelectedConversationId(null);
      setNotice(
        "Выбор отменён. Можно продолжить общение и выбрать другого исполнителя.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Не удалось отменить выбор исполнителя",
      );
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function recoverSelectedChat() {
    if (!chatRecovery) return;
    setBusy(true);
    setPendingAction("recover-selected-chat");
    setError(null);
    try {
      const result = await retrySelectedProviderConversation({
        requestId: req.id,
        providerId: chatRecovery.providerId,
        providerName: chatRecovery.providerName,
        previousConversations: conversations,
      });
      if (result.kind === "ready") {
        setConversations(result.conversations);
        setSelectedConversationId(result.selectedConversationId);
        setChatRecovery(null);
        return;
      }
      setChatRecovery(result);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось открыть выбранный чат",
      );
    } finally {
      setBusy(false);
      setPendingAction(null);
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
      setError(
        e instanceof Error ? e.message : "Не удалось загрузить документ",
      );
    } finally {
      setDocUploadBusy(false);
    }
  }

  async function deleteRequest() {
    const confirmed = await confirm({
      title: "Удалить заявку?",
      description:
        "Заявка будет удалена безвозвратно. Это можно сделать только пока ни один исполнитель не ответил.",
      confirmText: "Удалить",
      confirmColor: "error",
    });
    if (!confirmed) return;

    setBusy(true);
    setPendingAction("delete");
    setError(null);
    setNotice(null);
    try {
      await deleteCustomerRequest(req.id);
      router.push("/profile?section=requests");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить заявку");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function deleteRequestedDocument(docRequestId: string) {
    const ok = await confirm({
      title: "Удалить загруженный документ?",
      description:
        "Файл будет удалён. Если документ нужен снова — загрузите его повторно.",
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
    if (!canAcceptContract) {
      setTermsError(
        !allRequestedDocumentsUploaded
          ? "Загрузите все запрошенные документы."
          : "Проверьте документы и согласованную цену.",
      );
      return;
    }
    if (!termsVersion) {
      setTermsError("Версия пользовательского соглашения не загружена");
      return;
    }
    setBusy(true);
    setPendingAction("accept-contract");
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
      const message =
        e instanceof Error ? e.message : "Не удалось заключить договор";
      setTermsError(message);
      setError(message);
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  function openContractDialog() {
    setTermsAccepted(false);
    setTermsError(null);
    setContractDialogOpen(true);
    void loadTermsVersion();
  }

  async function acceptResult() {
    const remaining = finance.remainingAmountRubles ?? 0;
    const ok = await confirm({
      title: "Принять результат?",
      description: [
        "Работа будет считаться принятой. Если есть недостатки — лучше отправить замечания, исполнитель доработает. Принятие нельзя отменить.",
        remaining > 0 ? `Осталось оплатить: ${formatRubles(remaining)}.` : null,
      ]
        .filter(Boolean)
        .join(" "),
      confirmText: "Принять",
      confirmColor: "success",
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/requests/${req.id}/accept-result`, {
        method: "POST",
      });
      const payload = (await res.json().catch(() => null)) as
        | { error?: string }
        | unknown
        | null;
      if (!res.ok) {
        throw new Error(
          payload &&
            typeof payload === "object" &&
            payload &&
            "error" in (payload as any)
            ? ((payload as any).error as string)
            : "Не удалось принять результат",
        );
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
    const ok = await confirm({
      title: "Вернуть работу на доработку?",
      description:
        "Заявка вернётся исполнителю в работу. Когда он снова сдаст результат, у вас снова будет 7 дней на проверку.",
      confirmText: "Отправить замечания",
      confirmColor: "warning",
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/requests/${req.id}/send-remarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks: normalized }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { error?: string }
        | unknown
        | null;
      if (!res.ok) {
        throw new Error(
          payload &&
            typeof payload === "object" &&
            payload &&
            "error" in (payload as any)
            ? ((payload as any).error as string)
            : "Не удалось отправить замечания",
        );
      }
      await refreshRequest();
      await loadRemarks().catch(() => null);
      setNotice("Замечания отправлены. Заявка возвращена в работу.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось отправить замечания",
      );
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
      setError(
        e instanceof Error ? e.message : "Не удалось добавить замечание",
      );
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
      setError(
        e instanceof Error
          ? e.message
          : "Не удалось отметить замечание выполненным",
      );
    } finally {
      setBusy(false);
    }
  }

  const requestBody = resolveRequestDetailBody(req.message, req.serviceTitle);
  const headerTitle = resolveRequestDetailTitle(
    req.subjectType,
    req.serviceTitle,
  );
  const showCounterparty = canShowCustomerCounterpartyButton({
    lockedAt: req.lockedAt,
  });
  const showPayment = true;
  const priceView = resolveRequestPriceView({
    totalAmountRubles: finance.totalAmountRubles,
    servicePriceRubles: req.servicePriceRubles,
    priceProposal: finance.priceProposal,
  });
  const createdNotice =
    justCreated &&
    req.status === "NEW" &&
    (req.subjectType === "SERVICE" || !req.lockedAt)
      ? req.subjectType === "SERVICE"
        ? req.message?.trim()
          ? "Заявка отправлена исполнителю услуги. Ответ появится в этом чате. Здесь можно уточнить задачу и согласовать условия."
          : "Заявка создана. Напишите исполнителю в чате, что нужно сделать, и согласуйте условия."
        : "Заявка опубликована. Подходящие исполнители смогут откликнуться здесь. Обсудите предложения в отдельных чатах и выберите одного исполнителя."
      : null;
  const providerFields = getProviderContactFields({
    providerName: req.providerName,
    providerPhone: req.providerPhone,
    providerEmail: req.providerEmail,
  });

  const panelItems = [
    {
      id: "cadastral",
      label: "Кадастровый номер",
      visible: true,
      endIcon: <PinDropOutlinedIcon />,
    },
    {
      id: "payment",
      label: resolvePaymentTriggerLabel(finance.totalAmountRubles),
      caption: priceView.triggerCaption,
      visible: showPayment,
      endIcon: <PaymentIcon />,
    },
    {
      id: "counterparty",
      label: resolveProviderTriggerLabel(req.providerName),
      visible: showCounterparty,
      endIcon: <AssignmentIndIcon />,
    },
  ] as const;

  const cadastralBehavior = useMemo(
    () =>
      createRequestCadastralBehavior({
        status: req.status,
        numbers: req.cadastralNumbers ?? [],
        actions: {
          add: async (value) => {
            setBusy(true);
            try {
              const next = await appendCustomerCadastralNumber(req.id, value);
              setReq(next);
            } finally {
              setBusy(false);
            }
          },
          edit: async (index, value) => {
            setBusy(true);
            try {
              const next = await updateCustomerCadastralNumber(
                req.id,
                index,
                value,
              );
              setReq(next);
            } finally {
              setBusy(false);
            }
          },
          delete: async (index) => {
            setBusy(true);
            try {
              const next = await deleteCustomerCadastralNumber(req.id, index);
              setReq(next);
            } finally {
              setBusy(false);
            }
          },
        },
      }),
    [req.cadastralNumbers, req.id, req.status],
  );

  const activePanel = panelItems.find(
    (p) => p.id === activePanelId && (p.visible ?? true),
  );
  const isPanelOpen = Boolean(activePanel);
  const showProviderSelection = resolveProviderSelectionVisibility({
    subjectType: req.subjectType,
    lockedAt: req.lockedAt,
  });
  const panelTitle =
    activePanel?.id === "payment"
      ? "Цена и оплата"
      : activePanel?.id === "counterparty"
        ? "Исполнитель"
        : "Кадастровый номер";
  const panelIcon =
    activePanel?.id === "payment" ? (
      <PaymentIcon />
    ) : activePanel?.id === "counterparty" ? (
      <AssignmentIndIcon />
    ) : (
      <PinDropOutlinedIcon />
    );
  const panelContent =
    activePanel?.id === "payment" ? (
      <RequestPayments
        mode="customer"
        requestId={req.id}
        conversationId={selectedConversationId ?? undefined}
        status={req.status}
        lockedAt={req.lockedAt}
        totalAmountRubles={finance.totalAmountRubles}
        servicePriceRubles={req.servicePriceRubles}
        priceProposal={finance.priceProposal}
        canProposePrice={finance.canProposePrice}
        canAcceptPrice={finance.canAcceptPrice}
        paidAmountRubles={finance.paidAmountRubles}
        remainingAmountRubles={finance.remainingAmountRubles}
        payments={finance.payments}
        busy={busy}
        onBusyChange={setPaymentsBusy}
        onChanged={refreshFinance}
      />
    ) : activePanel?.id === "counterparty" ? (
      <RequestCounterpartyPanel
        fields={providerFields}
        avatarSrc={req.providerImage}
        avatarName={req.providerName}
      />
    ) : (
      <RequestCadastralNumbers behavior={cadastralBehavior} busy={busy} />
    );

  if (unavailable)
    return (
      <RequestUnavailableNotice
        status={unavailable}
        returnHref="/profile?section=requests"
      />
    );

  return (
    <ChatBodyWithSidePanelLayout
      rightCollapsed={wide && chatCollapsed}
      onExpandRight={() => { collapseSidebar(); setChatCollapsed(false); }}
      middle={
        <Stack spacing={2}>
          {req.assignedMember ? (
            <Paper sx={{ p: 2 }}>
              <RequestAssignee
                providerName={req.providerName}
                member={req.assignedMember}
              />
            </Paper>
          ) : null}
          {req.fiasInactiveWarning ? (
            <RequestCityInactiveWarning
              show={req.fiasInactiveWarning}
              city={req.requestCity}
            />
          ) : null}
          <RequestDetailPanelLayer
            open={isPanelOpen}
            title={panelTitle}
            icon={panelIcon}
            panel={panelContent}
            onClose={() => setActivePanelId(null)}
          >
            {createdNotice ? (
              <Alert severity="success" role="status">
                {createdNotice}
              </Alert>
            ) : null}
            <RequestDetailHeaderCard
              title={headerTitle}
              reference={formatRequestReference(req)}
              subtitle={pickTitle(req)}
              statusLabel={getRequestDisplayStatusLabel(req)}
              body={requestBody}
              nextStep={
                isExclusiveStatus &&
                !req.contractAcceptedAt &&
                (hasPending || canAcceptContract || hasRevisionRequested) ? (
                  <Alert
                    severity="info"
                    icon={false}
                    sx={{
                      bgcolor: "background.paper",
                      color: "text.primary",
                      border: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {hasPending
                          ? "Проверьте договор — исполнитель ждёт вашего решения."
                          : canAcceptContract
                            ? "Документы одобрены. Можно заключить договор."
                            : "Договор на доработке. Ждём обновлённый файл от исполнителя."}
                      </Typography>
                      {hasPending ? (
                        <Button
                          variant="outlined"
                          color="inherit"
                          onClick={() => {
                            const target =
                              document.getElementById("contract-review");
                            target?.scrollIntoView({
                              block: "start",
                              behavior: "smooth",
                            });
                            target?.focus({ preventScroll: true });
                          }}
                        >
                          Проверить договор
                        </Button>
                      ) : canAcceptContract ? (
                        <Button
                          variant="outlined"
                          color="inherit"
                          disabled={busy}
                          onClick={openContractDialog}
                        >
                          Перейти к заключению
                        </Button>
                      ) : null}
                    </Stack>
                  </Alert>
                ) : null
              }
              lead={
                <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                  <RequestPriceBlock
                    totalAmountRubles={finance.totalAmountRubles}
                    servicePriceRubles={req.servicePriceRubles}
                    priceProposal={finance.priceProposal}
                    serviceId={req.serviceId}
                  />
                  {req.status === "ACCEPTANCE_PENDING" ? (
                    <RequestPriceBlock
                      totalAmountRubles={finance.totalAmountRubles}
                      servicePriceRubles={req.servicePriceRubles}
                      priceProposal={finance.priceProposal}
                      statedOnly
                    />
                  ) : null}
                </Stack>
              }
              details={
                <RequestDetails
                  busy={busy}
                  behavior={createCustomerRequestDetailsBehavior({
                    request: req,
                    canAcceptContract,
                  })}
                />
              }
              footerEnd={
                <RequestDetailPanelTriggers
                  items={panelItems}
                  onOpen={(id) => setActivePanelId(id as never)}
                />
              }
              afterBody={
                <Stack
                  direction="row"
                  spacing={1.5}
                  useFlexGap
                  sx={{
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
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
                  {req.canDeleteByCustomer ? (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      loading={pendingAction === "delete"}
                      disabled={busy}
                      onClick={() => void deleteRequest()}
                    >
                      Удалить заявку
                    </Button>
                  ) : null}
                </Stack>
              }
            />
          </RequestDetailPanelLayer>

          {notice ? <Alert severity="success">{notice}</Alert> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
          {remarksError ? (
            <Alert severity="warning">{remarksError}</Alert>
          ) : null}
          {isServiceRequest &&
          req.status === "NEW" &&
          req.awaitingProviderReply ? (
            <Alert severity="info">
              Сообщение отправлено. Ждём ответа исполнителя.
            </Alert>
          ) : null}

          <RequestReviewsPanel
            key={req.id}
            requestId={req.id}
            status={req.status}
            side="customer"
          />

          <RequestWorkProgress
            mode="customer"
            requestId={req.id}
            requestStatus={req.status}
            stages={workStages}
            statusOptions={workStageStatusOptions}
            busy={busy}
            onBusyChange={setProgressBusy}
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

          <div ref={documentsRef}>
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
              onContractDecisionBusyChange={setContractDecisionBusy}
            />
          </div>

          {req.subjectType !== "SERVICE" &&
          req.providerId &&
          req.lockedAt &&
          !req.contractAcceptedAt &&
          ["NEW", "DISCUSSING", "TERMS_AGREED"].includes(req.status) ? (
            <Box>
              <Button
                variant="outlined"
                color="warning"
                disabled={busy}
                loading={pendingAction === "cancel-selection"}
                onClick={() => void cancelProviderSelection()}
              >
                Отменить выбор исполнителя
              </Button>
            </Box>
          ) : null}

          <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography
                sx={{
                  fontWeight: 700,
                }}
              >
                {conversationCopy.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                }}
              >
                {conversations.length === 0 && req.subjectType !== "SERVICE"
                  ? "Отклики и чаты с исполнителями появятся здесь."
                  : conversationCopy.description}
              </Typography>
            </Box>
            <Divider />
            {conversations.length === 0 ? (
              <Box sx={{ p: 2 }}>
                {req.subjectType === "SERVICE" ? (
                  <Stack spacing={1.25}>
                    <Typography sx={{ color: "text.secondary" }}>
                      Чат ещё не начат. Нажмите кнопку ниже, чтобы открыть
                      диалог с исполнителем.
                    </Typography>
                    <Box>
                      <Button
                        variant="contained"
                        loading={pendingAction === "chat"}
                        disabled={busy}
                        onClick={() => void ensureServiceChat()}
                      >
                        Начать чат
                      </Button>
                    </Box>
                  </Stack>
                ) : (
                  <Typography sx={{ color: "text.secondary" }}>
                    Заявка опубликована и ждёт откликов. Ответы исполнителей
                    появятся здесь.
                  </Typography>
                )}
              </Box>
            ) : (
              <List dense disablePadding>
                {conversations.map((c) => {
                  const isSelected = (req.selectedProviderIds ?? []).includes(
                    c.providerId,
                  );
                  const isDeclined = (req.declinedProviderIds ?? []).includes(
                    c.providerId,
                  );
                  const rowCanInitiate = isSelected
                    ? true
                    : canInitiateOrderFor(c.providerId);
                  const isChosenProvider =
                    hasRequestLock(req) && req.providerId === c.providerId;

                  return (
                    <ListItem
                      key={c.conversationId}
                      disablePadding
                      sx={{
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: "stretch",
                      }}
                    >
                      <ListItemButton
                        selected={c.conversationId === selectedConversationId}
                        onClick={() =>
                          setSelectedConversationId(c.conversationId)
                        }
                        sx={{
                          minWidth: 0,
                          flex: 1,
                          "&.Mui-selected": { bgcolor: "action.selected" },
                          "&.Mui-selected:hover": {
                            bgcolor: "action.selected",
                          },
                        }}
                      >
                        <ListItemText
                          primary={
                            <Stack
                              direction="row"
                              spacing={1}
                              useFlexGap
                              sx={{
                                alignItems: "center",
                                flexWrap: "wrap",
                              }}
                            >
                              <Typography
                                component="span"
                                sx={{
                                  overflowWrap: "anywhere",
                                  fontWeight:
                                    c.conversationId === selectedConversationId
                                      ? 800
                                      : 700,
                                }}
                              >
                                {c.providerName}
                              </Typography>
                              {/* Why: offer SELECTED значит «заявка отправлена компании», исполнителем она становится только после фиксации. */}
                              {isChosenProvider ? (
                                <Chip
                                  size="small"
                                  color="success"
                                  label="Исполнитель"
                                />
                              ) : null}
                              {!isSelected && isDeclined ? (
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label="Отказ"
                                />
                              ) : null}
                            </Stack>
                          }
                          secondary={c.lastSnippet ?? "—"}
                          slotProps={{
                            secondary: { noWrap: false },
                          }}
                        />
                      </ListItemButton>
                      {req.status !== "CLOSED" &&
                      (isChosenProvider || showProviderSelection) ? (
                        <Box
                          sx={{
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            px: 2,
                            pb: { xs: 1.5, sm: 0 },
                          }}
                        >
                          {isChosenProvider ? (
                            <Stack direction="row" spacing={1} sx={{ pr: 1 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                disabled
                                sx={{ whiteSpace: "normal" }}
                              >
                                {isOrderExecutionStatus(req.status) ||
                                req.status === "CANCELLED"
                                  ? getRequestDisplayStatusLabel(req)
                                  : hasContractBundles
                                    ? "Договор прикреплён"
                                    : "Ожидаем договор"}
                              </Button>
                            </Stack>
                          ) : !showProviderSelection ? null : (
                            <Stack direction="row" spacing={1} sx={{ pr: 1 }}>
                              <Button
                                color="secondary"
                                size="small"
                                variant="contained"
                                loading={
                                  pendingAction === `select:${c.providerId}`
                                }
                                disabled={!rowCanInitiate || busy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void selectProvider(
                                    c.providerId,
                                    c.providerName,
                                  );
                                }}
                                sx={{ whiteSpace: "normal" }}
                              >
                                {isDeclined
                                  ? "Предложить снова"
                                  : "Выбрать исполнителем"}
                              </Button>
                            </Stack>
                          )}
                        </Box>
                      ) : null}
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
            <DialogTitle>Заключение договора с исполнителем</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={1.5}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                  }}
                >
                  Договор заключается напрямую между вами и исполнителем (по
                  согласованным условиям сделки и файлам договора). Платформа
                  стороной этого договора не является — см.{" "}
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
                <Typography variant="body2" color="text.secondary">
                  Здесь вы подтверждаете согласие с условиями договора. Подпись
                  КЭП и файл подписи на сайте не создаются.
                </Typography>
                <RequestPriceBlock
                  totalAmountRubles={finance.totalAmountRubles}
                  servicePriceRubles={req.servicePriceRubles}
                  priceProposal={finance.priceProposal}
                  statedOnly
                />
                {!canAcceptContract ? (
                  <Alert
                    severity="warning"
                    action={
                      !allRequestedDocumentsUploaded ? (
                        <Button
                          color="inherit"
                          onClick={() => {
                            setContractDialogOpen(false);
                            requestAnimationFrame(() =>
                              documentsRef.current?.scrollIntoView({
                                block: "center",
                                behavior: "smooth",
                              }),
                            );
                          }}
                        >
                          Загрузить документы
                        </Button>
                      ) : undefined
                    }
                  >
                    {!allRequestedDocumentsUploaded
                      ? "Исполнитель запросил документы. Загрузите их перед заключением договора."
                      : "Условия заявки изменились. Проверьте документы и согласованную цену."}
                  </Alert>
                ) : null}
                {termsError ? (
                  <Alert severity="error">{termsError}</Alert>
                ) : null}
                {termsBusy ? (
                  <Typography
                    sx={{
                      color: "text.secondary",
                    }}
                  >
                    Загрузка версии соглашения…
                  </Typography>
                ) : null}
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
              <Button
                disabled={busy}
                onClick={() => setContractDialogOpen(false)}
              >
                Вернуться к обсуждению
              </Button>
              <Button
                variant="contained"
                color="success"
                loading={pendingAction === "accept-contract"}
                disabled={
                  busy ||
                  termsBusy ||
                  !termsAccepted ||
                  !termsVersion ||
                  !canAcceptContract
                }
                onClick={() => void acceptContract()}
              >
                Подтвердить заключение
              </Button>
            </DialogActions>
          </Dialog>
        </Stack>
      }
      right={
        selectedConversationId ? (
          <ServiceRequestChatPanel
            serviceRequestId={req.id}
            viewerRole="CUSTOMER"
            counterpartyName={selectedConversation?.providerName ?? req.providerName}
            requestInfo={req}
            conversationId={selectedConversationId}
            title="Чат"
            subtitle={selectedConversation?.providerName ?? pickTitle(req)}
            requestLockedAt={req.lockedAt}
            selectedProviderId={req.providerId}
            requestArchived={Boolean(
              req.lockedAt &&
              selectedConversation &&
              selectedConversation.providerId !== req.providerId,
            )}
            onOpenSelectedConversation={() => {
              const nextConversationId = resolveActiveConversationId({
                conversations,
                currentConversationId: selectedConversationId,
                lockedAt: req.lockedAt,
                selectedProviderId: req.providerId,
              });
              setSelectedConversationId(nextConversationId);
            }}
            onCollapse={wide ? () => setChatCollapsed(true) : undefined}
            autoFocusInput={justCreated}
          />
        ) : chatRecovery ? (
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={1.5}>
              <Alert severity="warning">{chatRecovery.message}</Alert>
              <Box>
                <Button
                  variant="contained"
                  loading={pendingAction === "recover-selected-chat"}
                  disabled={busy && pendingAction !== "recover-selected-chat"}
                  onClick={() => void recoverSelectedChat()}
                >
                  Открыть чат выбранного исполнителя
                </Button>
              </Box>
            </Stack>
          </Paper>
        ) : (
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography
              sx={{
                color: "text.secondary",
              }}
            >
              {!conversationsLoaded
                ? "Загружаем переписку…"
                : conversations.length > 0
                  ? conversationCopy.noSelectionHint
                  : req.subjectType === "SERVICE"
                    ? "Нажмите «Начать чат», чтобы задать вопрос исполнителю."
                    : "Здесь появится переписка, как только компания ответит на заявку."}
            </Typography>
          </Paper>
        )
      }
    />
  );
}
