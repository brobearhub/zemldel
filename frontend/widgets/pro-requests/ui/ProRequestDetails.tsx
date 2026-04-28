"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { StatusProgressStepper } from "@/entities/request/ui/request-ui";
import {
  buildRequestFlowSteps,
  getRequestFlowActiveStepId,
  getRequestStatusLabel,
  isOpenRequestStatus,
  resolveRequestDetailBody,
  type RequestProDto,
} from "@/entities/request";
import { isExclusiveProviderPhaseStatus, isOrderExecutionStatus } from "@/entities/request";
import { OrderPassportPanel } from "@/widgets/pro-requests/ui/OrderPassportPanel";
import { RequestRemindersPanel } from "@/widgets/pro-requests/ui/RequestRemindersPanel";
import Link from "@/shared/ui/Link";
import { RequestDetailHeaderCard } from "@/shared/ui/RequestDetailHeaderCard";

type Props = {
  initialRequest: RequestProDto;
  subtitle: string;
};

type NextAction = { action: "confirm" | "decline"; label: string };
type ContractTemplateOption = { id: string; title: string; updatedAt: string };
type ContractInstanceOption = {
  id: string;
  title: string;
  status: "DRAFT" | "SENT" | "SIGNED" | "CANCELLED";
  requestId: string | null;
  updatedAt: string;
};

function getNextActions(req: RequestProDto): NextAction[] {
  if (req.status === "CLOSED") return [];
  if (req.isLocked) return [];

  if (req.status === "PAYMENT_PROCESSING") return [{ action: "confirm", label: "Начать работу" }];
  if (req.status === "ACTIVE") return [{ action: "confirm", label: "Услуга выполнена" }];
  if (req.status === "SERVICE_RENDERED") return [{ action: "confirm", label: "Передать на принятие" }];
  if (req.status === "ACCEPTED") return [{ action: "confirm", label: "Выплатить исполнителю" }];
  if (req.status === "PAID") return [{ action: "confirm", label: "Завершить" }];

  if (!isOrderExecutionStatus(req.status) && req.offerStatus === "SELECTED") {
    return [{ action: "decline", label: "Отказать" }];
  }

  return [];
}

function contractStatusLabel(status: ContractInstanceOption["status"]) {
  if (status === "SIGNED") return "Принят клиентом";
  if (status === "SENT") return "Отправлен клиенту";
  if (status === "CANCELLED") return "Отменён";
  return "Черновик";
}

export function ProRequestDetails({ initialRequest, subtitle }: Props) {
  const [req, setReq] = useState(initialRequest);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [contractOptionsLoaded, setContractOptionsLoaded] = useState(false);
  const [templates, setTemplates] = useState<ContractTemplateOption[]>([]);
  const [instances, setInstances] = useState<ContractInstanceOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedDraftId, setSelectedDraftId] = useState("");

  const nextActions = useMemo(() => getNextActions(req), [req]);
  const showContractWorkflow = !req.isLocked && req.offerStatus === "SELECTED";
  const attachableDrafts = useMemo(
    () => instances.filter((item) => item.status === "DRAFT" && (!item.requestId || item.requestId === req.id)),
    [instances, req.id]
  );
  const pendingInfo =
    req.offerStatus === "SELECTED"
      ? "Клиент выбрал вас исполнителем. Подготовьте и отправьте договор."
      : req.offerStatus === "DECLINED"
        ? "Вы отказались от предложения."
        : null;

  useEffect(() => {
    if (!showContractWorkflow || contractOptionsLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const [templatesRes, instancesRes] = await Promise.all([
          fetch("/api/pro/contracts/templates", { cache: "no-store" }),
          fetch("/api/pro/contracts/instances", { cache: "no-store" }),
        ]);
        if (!templatesRes.ok || !instancesRes.ok) return;
        const [templatesPayload, instancesPayload] = await Promise.all([
          templatesRes.json(),
          instancesRes.json(),
        ]);
        if (cancelled) return;
        const nextTemplates = Array.isArray(templatesPayload) ? (templatesPayload as ContractTemplateOption[]) : [];
        const nextInstances = Array.isArray(instancesPayload) ? (instancesPayload as ContractInstanceOption[]) : [];
        setTemplates(nextTemplates);
        setInstances(nextInstances);
        setSelectedTemplateId((current) => current || nextTemplates[0]?.id || "");
        const firstDraft = nextInstances.find((item) => item.status === "DRAFT" && (!item.requestId || item.requestId === req.id));
        setSelectedDraftId((current) => current || firstDraft?.id || "");
        setContractOptionsLoaded(true);
      } catch {
        if (!cancelled) setContractOptionsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contractOptionsLoaded, req.id, showContractWorkflow]);

  async function refresh() {
    const res = await fetch(`/api/pro/requests/${req.id}`, { cache: "no-store" });
    const payload = (await res.json().catch(() => null)) as { error?: string } | RequestProDto | null;
    if (!res.ok) {
      throw new Error(payload && typeof payload === "object" && "error" in payload ? payload.error ?? "Не удалось обновить заявку" : "Не удалось обновить заявку");
    }
    setReq(payload as RequestProDto);
  }

  async function refreshContractOptions() {
    const [templatesRes, instancesRes] = await Promise.all([
      fetch("/api/pro/contracts/templates", { cache: "no-store" }),
      fetch("/api/pro/contracts/instances", { cache: "no-store" }),
    ]);
    if (!templatesRes.ok || !instancesRes.ok) return;
    const [templatesPayload, instancesPayload] = await Promise.all([
      templatesRes.json(),
      instancesRes.json(),
    ]);
    setTemplates(Array.isArray(templatesPayload) ? (templatesPayload as ContractTemplateOption[]) : []);
    setInstances(Array.isArray(instancesPayload) ? (instancesPayload as ContractInstanceOption[]) : []);
  }

  async function createContractFromTemplate() {
    if (!selectedTemplateId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/pro/contracts/instances", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplateId, serviceRequestId: req.id }),
      });
      const payload = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!res.ok) throw new Error(payload?.error ?? "Не удалось создать договор");
      await Promise.all([refresh(), refreshContractOptions()]);
      setNotice("Черновик договора создан и привязан к заявке.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать договор");
    } finally {
      setBusy(false);
    }
  }

  async function attachDraftContract() {
    if (!selectedDraftId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/pro/contracts/requests/${req.id}/instances/${selectedDraftId}/attach`, { method: "POST" });
      const payload = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!res.ok) throw new Error(payload?.error ?? "Не удалось прикрепить договор");
      await Promise.all([refresh(), refreshContractOptions()]);
      setNotice("Черновик договора прикреплён к заявке.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось прикрепить договор");
    } finally {
      setBusy(false);
    }
  }

  async function sendContractToCustomer() {
    if (!req.contract?.id) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/pro/contracts/instances/${req.contract.id}/send`, { method: "POST" });
      const payload = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok) throw new Error(payload?.error ?? "Не удалось отправить договор");
      await Promise.all([refresh(), refreshContractOptions()]);
      setNotice("Договор отправлен клиенту.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить договор");
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
        if (req.status === "PAYMENT_PROCESSING") {
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
          const res = await fetch(`/api/pro/requests/${req.id}/payout`, { method: "POST" });
          const payload = (await res.json().catch(() => null)) as { error?: string } | unknown | null;
          if (!res.ok) throw new Error(payload && typeof payload === "object" && payload && "error" in (payload as any) ? ((payload as any).error as string) : "Не удалось выполнить выплату");
          await refresh();
          setNotice("Выплата произведена.");
          return;
        }
        if (req.status === "PAID") {
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
          <Typography variant="h6" fontWeight={800}>
            Детали
          </Typography>

          <StatusProgressStepper
            steps={buildRequestFlowSteps(req.status)}
            activeStepId={getRequestFlowActiveStepId(req.status)}
            muted={req.isLocked}
          />
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
              {req.contract ? <Chip size="small" label={contractStatusLabel(req.contract.status)} /> : null}
            </Stack>

            {req.contract ? (
              <Stack spacing={1.25}>
                <Typography fontWeight={700}>{req.contract.title}</Typography>
                {req.contract.status === "DRAFT" ? (
                  <Alert severity="info">
                    Черновик прикреплён к заявке. Проверьте текст и отправьте его клиенту.
                  </Alert>
                ) : null}
                {req.contract.status === "SENT" && req.contract.openCommentsCount > 0 ? (
                  <Alert severity="warning">
                    Клиент оставил комментарии: {req.contract.openCommentsCount}. Ответьте и закройте их перед принятием договора.
                  </Alert>
                ) : null}
                {req.contract.status === "SENT" && req.contract.openCommentsCount === 0 ? (
                  <Alert severity="success">Договор у клиента. Он может прочитать его, оставить комментарии или принять.</Alert>
                ) : null}
                {req.contract.status === "SIGNED" ? (
                  <Alert severity="success">Клиент принял договор. Следующий шаг для клиента - оплата.</Alert>
                ) : null}
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button
                    component={Link}
                    href={`/pro/documents/contracts/instances/${req.contract.id}`}
                    variant="outlined"
                    disabled={busy}
                  >
                    Договор
                  </Button>
                  {req.contract.status === "DRAFT" ? (
                    <Button variant="contained" disabled={busy} onClick={() => void sendContractToCustomer()}>
                      Отправить клиенту
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            ) : (
              <Stack spacing={1.5}>
                <Alert severity="info">Договор ещё не прикреплён к заявке.</Alert>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1.5}>
                    <Typography fontWeight={800}>Создать из шаблона</Typography>
                    <FormControl fullWidth size="small">
                      <InputLabel id="request-contract-template-label">Шаблон договора</InputLabel>
                      <Select
                        labelId="request-contract-template-label"
                        label="Шаблон договора"
                        value={selectedTemplateId}
                        onChange={(event) => setSelectedTemplateId(event.target.value)}
                        disabled={busy || templates.length === 0}
                      >
                        {templates.map((template) => (
                          <MenuItem key={template.id} value={template.id}>
                            {template.title}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Button variant="contained" disabled={busy || !selectedTemplateId} onClick={() => void createContractFromTemplate()}>
                      Создать и прикрепить
                    </Button>
                    {templates.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Шаблонов пока нет. Создайте шаблон в разделе договоров.
                      </Typography>
                    ) : null}
                  </Stack>
                </Paper>

                <Divider>или</Divider>

                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1.5}>
                    <Typography fontWeight={800}>Прикрепить существующий черновик</Typography>
                    <FormControl fullWidth size="small">
                      <InputLabel id="request-contract-draft-label">Черновик</InputLabel>
                      <Select
                        labelId="request-contract-draft-label"
                        label="Черновик"
                        value={selectedDraftId}
                        onChange={(event) => setSelectedDraftId(event.target.value)}
                        disabled={busy || attachableDrafts.length === 0}
                      >
                        {attachableDrafts.map((draft) => (
                          <MenuItem key={draft.id} value={draft.id}>
                            {draft.title}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Button variant="outlined" disabled={busy || !selectedDraftId} onClick={() => void attachDraftContract()}>
                      Прикрепить к заявке
                    </Button>
                    {attachableDrafts.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Подходящих черновиков пока нет.
                      </Typography>
                    ) : null}
                  </Stack>
                </Paper>

                <Button
                  component={Link}
                  href={`/pro/documents/contracts?requestId=${encodeURIComponent(req.id)}`}
                  variant="text"
                  disabled={busy}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Все договоры
                </Button>
              </Stack>
            )}
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
              disabled={busy}
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
