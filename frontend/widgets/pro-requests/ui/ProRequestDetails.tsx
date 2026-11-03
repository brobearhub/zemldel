"use client";
import { RequestUnavailableNotice, isRequestAccessFailure, type RequestAccessFailure } from "@/shared/ui/RequestUnavailableNotice";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { RequestCityInactiveWarning } from "@/shared/ui/RequestCityInactiveWarning";
import {
  canProviderManageDealDocuments,
  mergeWorkStageStatusOptions,
  RequestPriceBlock,
  resolvePaymentTriggerLabel,
  resolveRequestDetailBody,
  resolveRequestDetailTitle,
  resolveRequestPriceView,
  SYSTEM_WORK_STAGE_STATUSES,
  type RequestRemarkDto,
  type RequestProDto,
  type WorkStageDto,
  type WorkStageStatusOptionDto,
} from "@/entities/request";
import { isOrderExecutionStatus } from "@/entities/request";
import type { RequestDocumentRequestDto } from "@/entities/request";
import {
  canShowProviderCounterpartyButton,
  getCustomerContactFields,
  RequestCounterpartyPanel,
} from "@/features/request-counterparty";
import { RequestRemindersPanel } from "@/widgets/pro-requests/ui/RequestRemindersPanel";
import Link from "@/shared/ui/Link";
import { RequestDetailHeaderCard } from "@/shared/ui/RequestDetailHeaderCard";
import { RequestDetailPanelLayer } from "@/shared/ui/RequestDetailPanelLayer";
import { RequestDetailPanelTriggers } from "@/shared/ui/RequestDetailPanelTriggers";
import { createProviderRequestDetailsBehavior, RequestDetails } from "@/widgets/request-details";
import { createProviderRequestLifecycleBehavior, RequestLifecycleActions } from "@/widgets/request-lifecycle-actions";
import { createProviderRequestRemarksBehavior, RequestRemarks } from "@/widgets/request-remarks";
import { RequestWorkProgress } from "@/widgets/request-work-progress";
import { RequestPayments } from "@/widgets/request-payments";
import { RequestReviewsPanel } from "@/widgets/request-reviews";
import { fetchProWorkStages, fetchWorkStageStatuses } from "@/entities/request/api/request-work-stages";
import {
  completeProRequestRemark,
  createProRequestRemark,
  fetchProRequestRemarks,
} from "@/entities/request/api/request-remarks";
import { submitProRequestDelivery } from "@/entities/request/api/request-delivery-submission";
import { shouldShowProviderPaymentPanel } from "../model/request-payment-panel-visibility";
import { buildRequestCompletionDescription } from "../model/request-completion-copy";
import { createExclusiveRequestGuard } from "../model/exclusive-request-guard";
import { resolveProviderRequestScreenModel } from "../model/provider-request-screen-model";
import { deleteProRequestContractFile } from "@/entities/request/api/pro-contract-files";
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
import { useConfirm, useConfirmWithReason } from "@/shared/ui/confirm";
import { useVisibleRefresh } from "@/shared/lib/use-visible-refresh";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import PaymentIcon from "@mui/icons-material/Payment";
import PinDropOutlinedIcon from "@mui/icons-material/PinDropOutlined";
import {
  appendProCadastralNumber,
  deleteProCadastralNumber,
  updateProCadastralNumber,
} from "@/entities/request/api/request-cadastral-numbers";
import { createRequestCadastralBehavior, RequestCadastralNumbers } from "@/widgets/request-cadastral-numbers";

type Props = {
  initialRequest: RequestProDto;
  subtitle: string;
  onRequestChange?: (request: RequestProDto) => void;
  onUnavailable?: (status: RequestAccessFailure) => void;
};

export function ProRequestDetails({ initialRequest, subtitle, onRequestChange, onUnavailable }: Props) {
  const [req, setReq] = useState(initialRequest);
  const [unavailable, setUnavailable] = useState<RequestAccessFailure | null>(null);
  useEffect(() => {
    onRequestChange?.(req);
  }, [req, onRequestChange]);
  const [exclusiveRequestGuard] = useState(createExclusiveRequestGuard);
  const exclusiveScopeRef = useRef(`${initialRequest.id}:${initialRequest.isLocked}`);
  const exclusiveScope = `${req.id}:${req.isLocked}`;
  if (exclusiveScopeRef.current !== exclusiveScope) {
    exclusiveScopeRef.current = exclusiveScope;
    exclusiveRequestGuard.invalidate();
  }
  const screenModel = resolveProviderRequestScreenModel(req);
  const [busy, setBusy] = useState(false);
  const [paymentsBusy, setPaymentsBusy] = useState(false);
  const [progressBusy, setProgressBusy] = useState(false);
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
  const [workStages, setWorkStages] = useState<WorkStageDto[]>([]);
  const [workStageStatusOptions, setWorkStageStatusOptions] = useState<WorkStageStatusOptionDto[]>([
    ...SYSTEM_WORK_STAGE_STATUSES,
  ]);
  const confirm = useConfirm();
  const confirmWithReason = useConfirmWithReason();
  const [activePanelId, setActivePanelId] = useState<"payment" | "counterparty" | "cadastral" | null>(null);

  const isBusy = busy || uploadBusy || paymentsBusy || progressBusy;
  const showContractWorkflow = canProviderManageDealDocuments(req);
  const hasPendingContractFiles = contractBundles.some((b) => b.status === "PENDING_CUSTOMER");
  const hasRevisionRequested = contractBundles.some((b) => b.status === "REVISION_REQUESTED");
  const hasApproved = contractBundles.some((b) => b.status === "APPROVED");
  const contractNextStepVisible = screenModel.showDealWorkflow && showContractWorkflow && !req.contractAcceptedAt && ["NEW", "DISCUSSING", "TERMS_AGREED"].includes(req.status) && req.totalAmountRubles != null;
  const contractNextStep = !contractBundlesLoaded ? "Проверяем состояние договора…" : hasPendingContractFiles ? "Договор отправлен. Ждём решения клиента." : hasRevisionRequested ? "Клиент просит доработать договор. Обновите файл в документах." : hasApproved ? "Договор одобрен. Ждём заключения договора клиентом." : "Цена согласована. Подготовьте и отправьте договор в разделе документов.";
  const hasPendingRequestedDocs = docRequests.some((d) => d.status === "REQUESTED");
  const hasUploadedDocs = docRequests.some((d) => d.status === "UPLOADED");

  const loadWorkStages = useCallback(
    async (isCurrent = () => true) => {
      if (!screenModel.showDealWorkflow) {
        setWorkStages([]);
        setWorkStageStatusOptions([...SYSTEM_WORK_STAGE_STATUSES]);
        return;
      }
      if (
        req.status !== "ACTIVE" &&
        req.status !== "ACCEPTANCE_PENDING" &&
        req.status !== "ACCEPTED" &&
        req.status !== "COMPLETED"
      ) {
        setWorkStages([]);
        return;
      }
      const generation = exclusiveRequestGuard.capture();
      const [stages, statuses] = await Promise.all([
        fetchProWorkStages(req.id),
        fetchWorkStageStatuses().catch(() => ({
          system: [...SYSTEM_WORK_STAGE_STATUSES],
          custom: [],
        })),
      ]);
      if (!isCurrent() || !exclusiveRequestGuard.isCurrent(generation)) return;
      setWorkStages(stages);
      setWorkStageStatusOptions(mergeWorkStageStatusOptions(statuses.custom));
    },
    [exclusiveRequestGuard, req.id, req.status, screenModel.showDealWorkflow],
  );

  async function loadRemarks() {
    if (!screenModel.showDealWorkflow) return;
    const generation = exclusiveRequestGuard.capture();
    const list = await fetchProRequestRemarks(req.id);
    if (!exclusiveRequestGuard.isCurrent(generation)) return;
    setRemarks(list);
  }

  useEffect(() => {
    if (screenModel.showDealWorkflow) return;
    setError(null);
    setRemarksError(null);
    setWorkStages([]);
    setWorkStageStatusOptions([...SYSTEM_WORK_STAGE_STATUSES]);
    setRemarks([]);
    setContractBundles([]);
    setContractBundlesLoaded(false);
    setMiscFiles([]);
    setMiscLoaded(false);
    setDocRequests([]);
    setDocRequestsLoaded(false);
    setActivePanelId(null);
  }, [screenModel.showDealWorkflow]);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/pro/requests/${req.id}`, {
      cache: "no-store",
    });
    const payload = (await res.json().catch(() => null)) as { error?: string } | RequestProDto | null;
    if (!res.ok) {
      throw new Error(
        payload && typeof payload === "object" && "error" in payload
          ? (payload.error ?? "Не удалось обновить заявку")
          : "Не удалось обновить заявку",
      );
    }
    setReq(payload as RequestProDto);
  }, [req.id]);

  useVisibleRefresh({
    requestId: req.id,
    refreshAt: req.status === "ACCEPTANCE_PENDING" ? req.autoAcceptAt : null,
    scope: `${req.id}:${req.isLocked}`,
    paused: isBusy || unavailable !== null,
    onRefresh: async (signal) => {
      const response = await fetch(`/api/pro/requests/${req.id}`, {
        cache: "no-store",
        signal,
      });
      if (isRequestAccessFailure(response.status)) {
        if (!signal.aborted) {
          exclusiveRequestGuard.invalidate();
          setUnavailable(response.status);
          onUnavailable?.(response.status);
        }
        return;
      }
      const next = (await response.json()) as RequestProDto;
      if (!response.ok || !next?.id || signal.aborted) return;
      if (!resolveProviderRequestScreenModel(next).showDealWorkflow) {
        // Never request deal resources for an archived provider.
        if (next.status !== req.status) setNotice(null);
        setReq(next);
        return;
      }
      const generation = exclusiveRequestGuard.capture();
      const executing = isOrderExecutionStatus(next.status);
      const documentsAvailable = canProviderManageDealDocuments(next);
      const [bundles, files, documents, stages, statuses, nextRemarks] = await Promise.allSettled([
        documentsAvailable ? fetchProRequestContractBundles(req.id) : Promise.resolve([]),
        documentsAvailable ? fetchProRequestMiscFiles(req.id) : Promise.resolve([]),
        documentsAvailable ? fetchProRequestDocumentRequests(req.id) : Promise.resolve([]),
        ["ACTIVE", "ACCEPTANCE_PENDING", "ACCEPTED", "COMPLETED"].includes(next.status)
          ? fetchProWorkStages(req.id)
          : Promise.resolve([]),
        executing ? fetchWorkStageStatuses() : Promise.resolve(null),
        executing ? fetchProRequestRemarks(req.id) : Promise.resolve([]),
      ]);
      if (signal.aborted || !exclusiveRequestGuard.isCurrent(generation)) return;
      if (next.status !== req.status) setNotice(null);
      setReq(next);
      if (bundles.status === "fulfilled") setContractBundles(bundles.value);
      if (files.status === "fulfilled") setMiscFiles(files.value);
      if (documents.status === "fulfilled") setDocRequests(documents.value);
      if (stages.status === "fulfilled") setWorkStages(stages.value);
      if (statuses.status === "fulfilled" && statuses.value) {
        setWorkStageStatusOptions(mergeWorkStageStatusOptions(statuses.value.custom));
      }
      if (nextRemarks.status === "fulfilled") {
        setRemarks(nextRemarks.value);
        setRemarksError(null);
      }
      setContractBundlesLoaded(true);
      setMiscLoaded(true);
      setDocRequestsLoaded(true);
    },
  });

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

  async function uploadContractBundle(input: { document: File; signature?: File | null }) {
    const startedAt = Date.now();
    setUploadBusy(true);
    setUploadNames([input.document.name, ...(input.signature ? [input.signature.name] : [])]);
    setError(null);
    setNotice(null);
    try {
      await uploadProRequestContractBundle(req.id, input);
      // Once upload succeeds, a failed refresh must not invite a duplicate upload.
      setNotice("Договор прикреплён к заявке.");
      await Promise.all([refresh(), refreshContractBundles()]).catch(() => {
        setNotice("Договор загружен. Не удалось обновить список — вернитесь во вкладку, чтобы повторить обновление.");
      });
    } catch (e) {
      const error = e instanceof Error ? e : new Error("Не удалось загрузить договор. Повторите попытку.");
      setError(error.message);
      throw error;
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

  async function runAction(action: "confirm" | "decline", value?: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (action === "confirm") {
        if (req.status === "ACTIVE") {
          if (typeof value !== "string") throw new Error("Укажите итог результата");
          await submitProRequestDelivery(req.id, value);
          await refresh();
          setNotice("Услуга передана на принятие клиенту.");
          return;
        }
        if (req.status === "ACCEPTED") {
          const res = await fetch(`/api/pro/requests/${req.id}/complete`, {
            method: "POST",
          });
          const payload: unknown = await res.json().catch(() => null);
          const errorMessage =
            payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
              ? payload.error
              : "Не удалось завершить";
          if (!res.ok) throw new Error(errorMessage);
          await refresh();
          setNotice("Сделка завершена.");
          return;
        }
      }

      if (action === "decline") {
        const normalizedReason = value?.trim() ?? "";
        if (!normalizedReason) {
          throw new Error("Укажите причину отказа");
        }
        const res = await fetch(`/api/pro/requests/${req.id}/decline-offer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: normalizedReason }),
        });
        const payload = (await res.json().catch(() => null)) as { error?: string } | RequestProDto | null;
        if (!res.ok) {
          throw new Error(
            payload && typeof payload === "object" && "error" in payload
              ? (payload.error ?? "Не удалось отказаться от заявки")
              : "Не удалось отказаться от заявки",
          );
        }
        setReq(payload as RequestProDto);
        setNotice("Вы отказались от заявки.");
        return;
      }

      throw new Error("Unsupported action");
    } catch (e) {
      const actionError = e instanceof Error ? e : new Error("Не удалось выполнить действие");
      setError(actionError.message);
      throw actionError;
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
  const headerTitle = resolveRequestDetailTitle(req.subjectType, req.serviceTitle);
  const showCounterparty = canShowProviderCounterpartyButton({
    lockedAt: req.lockedAt,
    isLocked: req.isLocked,
  });
  const showPayment = shouldShowProviderPaymentPanel({
    isLocked: req.isLocked,
    canProposePrice: req.canProposePrice,
    canAcceptPrice: req.canAcceptPrice,
  });
  const priceView = resolveRequestPriceView({
    totalAmountRubles: req.totalAmountRubles,
    servicePriceRubles: req.servicePriceRubles,
    priceProposal: req.priceProposal,
  });
  const customerFields = getCustomerContactFields({
    customerName: req.customerName,
    customerPhone: req.customerPhone,
    customerEmail: req.customerEmail,
  });

  const panelItems = [
    {
      id: "cadastral",
      label: "Кадастровый номер",
      visible: screenModel.showCadastralPanel,
      endIcon: <PinDropOutlinedIcon />,
    },
    {
      id: "payment",
      label: resolvePaymentTriggerLabel(req.totalAmountRubles),
      caption: priceView.triggerCaption,
      visible: showPayment,
      endIcon: <PaymentIcon />,
    },
    {
      id: "counterparty",
      label: "Клиент",
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
              const next = await appendProCadastralNumber(req.id, value);
              setReq(next);
            } finally {
              setBusy(false);
            }
          },
          edit: async (index, value) => {
            setBusy(true);
            try {
              const next = await updateProCadastralNumber(req.id, index, value);
              setReq(next);
            } finally {
              setBusy(false);
            }
          },
          delete: async (index) => {
            setBusy(true);
            try {
              const next = await deleteProCadastralNumber(req.id, index);
              setReq(next);
            } finally {
              setBusy(false);
            }
          },
        },
      }),
    [req.cadastralNumbers, req.id, req.status],
  );

  const activePanel = panelItems.find((p) => p.id === activePanelId && (p.visible ?? true));
  const isPanelOpen = Boolean(activePanel);
  const panelTitle =
    activePanel?.id === "payment"
      ? "Цена и оплата"
      : activePanel?.id === "counterparty"
        ? "Клиент"
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
        mode="provider"
        requestId={req.id}
        status={req.status}
        lockedAt={req.lockedAt}
        isLocked={req.isLocked}
        totalAmountRubles={req.totalAmountRubles}
        servicePriceRubles={req.servicePriceRubles}
        priceProposal={req.priceProposal}
        canProposePrice={req.canProposePrice}
        canAcceptPrice={req.canAcceptPrice}
        paidAmountRubles={req.paidAmountRubles}
        remainingAmountRubles={req.remainingAmountRubles}
        payments={req.payments}
        busy={isBusy}
        onBusyChange={setPaymentsBusy}
        onChanged={refresh}
      />
    ) : activePanel?.id === "counterparty" ? (
      <RequestCounterpartyPanel fields={customerFields} avatarSrc={req.customerImage} avatarName={req.customerName} />
    ) : activePanel?.id === "cadastral" ? (
      <RequestCadastralNumbers behavior={cadastralBehavior} busy={isBusy} />
    ) : null;

  if (unavailable) return <RequestUnavailableNotice status={unavailable} returnHref="/pro/requests" />;

  return (
    <Stack spacing={2}>
      <RequestDetailPanelLayer
        open={isPanelOpen}
        title={panelTitle}
        icon={panelIcon}
        panel={panelContent}
        onClose={() => setActivePanelId(null)}
      >
        <RequestDetailHeaderCard
          title={headerTitle}
          subtitle={subtitle}
          statusLabel={screenModel.statusLabel}
          body={messageBody}
          nextStep={contractNextStepVisible ? <Alert severity="info" icon={false} sx={{ bgcolor: "background.paper", color: "text.primary", border: 1, borderColor: "divider" }}>{contractNextStep}</Alert> : null}
          footerEnd={
            screenModel.showDealWorkflow ? (
              <RequestDetailPanelTriggers items={panelItems} onOpen={(id) => setActivePanelId(id as never)} />
            ) : null
          }
          lead={
            screenModel.showDealWorkflow ? (
              <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                <RequestPriceBlock
                  totalAmountRubles={req.totalAmountRubles}
                  servicePriceRubles={req.servicePriceRubles}
                  priceProposal={req.priceProposal}
                  serviceId={req.isLocked ? null : req.serviceId}
                />
                {req.status === "ACCEPTANCE_PENDING" ? (
                  <RequestPriceBlock
                    totalAmountRubles={req.totalAmountRubles}
                    servicePriceRubles={req.servicePriceRubles}
                    priceProposal={req.priceProposal}
                    statedOnly
                  />
                ) : null}
              </Stack>
            ) : null
          }
          details={
            screenModel.showDealWorkflow ? (
              <RequestDetails
                busy={isBusy}
                behavior={createProviderRequestDetailsBehavior({
                  request: req,
                })}
              />
            ) : (
              null
            )
          }
          afterBody={
            screenModel.showDealWorkflow ? (
              <RequestLifecycleActions
                busy={isBusy}
                behavior={createProviderRequestLifecycleBehavior({
                  request: req,
                  contractNextStepVisible,
                  isMarkRenderedDisabled: remarks.some((r) => r.status === "OPEN"),
                  actions: {
                    startWork: async () => undefined,
                    markRendered: async (summary) => {
                      await runAction("confirm", summary);
                    },
                    requestAcceptance: async () => undefined,
                    complete: async () => {
                      const remaining = req.remainingAmountRubles ?? 0;
                      const ok = await confirm({
                        title: "Завершить заявку?",
                        description: buildRequestCompletionDescription(remaining),
                        confirmText: "Завершить",
                        confirmColor: "success",
                      });
                      if (!ok) return;
                      await runAction("confirm");
                    },
                    declineOffer: async () => {
                      const reason = await confirmWithReason({
                        title: "Отказаться от заявки?",
                        description:
                          "Вы больше не будете исполнителем по этой заявке. Клиент сможет выбрать другого исполнителя. Это действие нельзя отменить.",
                        reasonLabel: "Причина",
                        confirmText: "Да, отказаться",
                        confirmColor: "error",
                      });
                      if (reason == null) return;
                      await runAction("decline", reason);
                    },
                  },
                })}
              />
            ) : null
          }
        />
      </RequestDetailPanelLayer>

      {req.fiasInactiveWarning ? (
        <RequestCityInactiveWarning show={req.fiasInactiveWarning} city={req.requestCity} />
      ) : null}

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
            <Stack
              direction="row"
              spacing={1.25}
              sx={{
                alignItems: "center",
              }}
            >
              <CircularProgress size={18} />
              <Typography
                sx={{
                  fontWeight: 900,
                }}
              >
                Загружаем файлы…
              </Typography>
            </Stack>
            <LinearProgress />
            {uploadNames.length > 0 ? (
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  wordBreak: "break-word",
                }}
              >
                {uploadNames.join(", ")}
              </Typography>
            ) : null}
          </Stack>
        </Paper>
      </Backdrop>

      {screenModel.showDealWorkflow ? (
        <>
          <RequestReviewsPanel key={req.id} requestId={req.id} status={req.status} side="provider" />

          <RequestWorkProgress
            mode="provider"
            requestId={req.id}
            requestStatus={req.status}
            stages={workStages}
            statusOptions={workStageStatusOptions}
            busy={isBusy}
            onBusyChange={setProgressBusy}
            onRefresh={loadWorkStages}
            onError={(message) => setError(message)}
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
        </>
      ) : null}
    </Stack>
  );
}
