"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { StatusProgressStepper } from "@/entities/order/ui/order-ui";
import {
  buildServiceRequestFlowSteps,
  getServiceRequestFlowActiveStepId,
  getServiceRequestStatusLabel,
  isServiceRequestOrderStatus,
  type ServiceRequestCustomerDto,
} from "@/entities/service-request";
import { ChatBodyWithSidePanelLayout } from "@/widgets/chat/ui/ChatBodyWithSidePanelLayout";
import { ServiceRequestChatPanel } from "@/widgets/chat/ui/ServiceRequestChatPanel";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function pickTitle(req: ServiceRequestCustomerDto) {
  if (req.subjectType === "SERVICE") return "Заявка по услуге";
  if (req.subjectType === "CATEGORY") return "Заявка по категории";
  return "Свободная заявка";
}

type Props = {
  initialRequest: ServiceRequestCustomerDto;
};

export function CustomerRequestConversationWorkspace({ initialRequest }: Props) {
  const [req, setReq] = useState<ServiceRequestCustomerDto>(initialRequest);
  const [conversations, setConversations] = useState<ChatServiceRequestConversationListItemDto[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerBusy, setOfferBusy] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerVersion, setOfferVersion] = useState<string | null>(null);
  const [offerMarkdown, setOfferMarkdown] = useState<string | null>(null);
  const [offerAccepted, setOfferAccepted] = useState(false);
  const [remarks, setRemarks] = useState("");

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.conversationId === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const loadConversations = useCallback(async () => {
    const res = await fetch(`/api/chat/service-requests/${req.id}/conversations`, { cache: "no-store" });
    const payload = (await res.json().catch(() => null)) as ChatServiceRequestConversationListItemDto[] | { error?: string } | null;
    if (!res.ok) {
      throw new Error(
        payload && typeof payload === "object" && !Array.isArray(payload) && payload.error ? payload.error : "Не удалось загрузить чаты"
      );
    }
    return payload as ChatServiceRequestConversationListItemDto[];
  }, [req.id]);

  const refreshRequest = useCallback(async () => {
    const res = await fetch(`/api/service-requests/${req.id}`, { cache: "no-store" });
    const payload = (await res.json().catch(() => null)) as ServiceRequestCustomerDto | { error?: string } | null;
    if (!res.ok) {
      throw new Error(
        payload && typeof payload === "object" && "error" in payload && payload.error ? payload.error : "Не удалось обновить заявку"
      );
    }
    setReq(payload as ServiceRequestCustomerDto);
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

  const isOrderStatus = isServiceRequestOrderStatus(req.status);

  function canInitiateOrderFor(providerId: string) {
    if (isOrderStatus || req.status === "CLOSED") return false;
    if ((req.selectedProviderIds ?? []).includes(providerId)) return false;
    return true;
  }

  async function initiateOrder(conversationId: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/service-requests/${req.id}/initiate-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | ServiceRequestCustomerDto | null;
      if (!res.ok) {
        throw new Error(payload && typeof payload === "object" && "error" in payload ? payload.error ?? "Не удалось запросить заказ" : "Не удалось запросить заказ");
      }
      setReq(payload as ServiceRequestCustomerDto);
      setNotice("Запрос отправлен. Ожидайте подтверждения компании.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось запросить заказ");
    } finally {
      setBusy(false);
      try {
        const list = await loadConversations();
        setConversations(list);
      } catch {
        // ignore
      }
    }
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
      const res = await fetch(`/api/service-requests/${req.id}/accept-terms`, { method: "POST" });
      const payload = (await res.json().catch(() => null)) as { error?: string } | ServiceRequestCustomerDto | null;
      if (!res.ok) {
        throw new Error(payload && typeof payload === "object" && "error" in payload ? payload.error ?? "Не удалось согласовать условия" : "Не удалось согласовать условия");
      }
      setReq(payload as ServiceRequestCustomerDto);
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
      const res = await fetch(`/api/service-requests/${req.id}/select-provider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | ServiceRequestCustomerDto | null;
      if (!res.ok) {
        throw new Error(payload && typeof payload === "object" && "error" in payload ? payload.error ?? "Не удалось выбрать исполнителя" : "Не удалось выбрать исполнителя");
      }
      setReq(payload as ServiceRequestCustomerDto);
      setNotice("Исполнитель выбран.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось выбрать исполнителя");
    } finally {
      setBusy(false);
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
      const res = await fetch(`/api/service-requests/${req.id}/accept-contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerVersion }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | ServiceRequestCustomerDto | null;
      if (!res.ok) {
        throw new Error(payload && typeof payload === "object" && "error" in payload ? payload.error ?? "Не удалось заключить договор" : "Не удалось заключить договор");
      }
      setReq(payload as ServiceRequestCustomerDto);
      setNotice("Договор заключен.");
      setOfferOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось заключить договор");
    } finally {
      setBusy(false);
    }
  }

  async function payEscrow() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/service-requests/${req.id}/pay`, { method: "POST" });
      const payload = (await res.json().catch(() => null)) as { error?: string } | ServiceRequestCustomerDto | null;
      if (!res.ok) {
        throw new Error(payload && typeof payload === "object" && "error" in payload ? payload.error ?? "Не удалось оплатить" : "Не удалось оплатить");
      }
      setReq(payload as ServiceRequestCustomerDto);
      setNotice("Средства зарезервированы (escrow).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось оплатить");
    } finally {
      setBusy(false);
    }
  }

  async function acceptResult() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/orders/mine/${req.id}/accept-result`, { method: "POST" });
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
      const res = await fetch(`/api/orders/mine/${req.id}/send-remarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | unknown | null;
      if (!res.ok) {
        throw new Error(payload && typeof payload === "object" && payload && "error" in (payload as any) ? ((payload as any).error as string) : "Не удалось отправить замечания");
      }
      setRemarks("");
      await refreshRequest();
      setNotice("Замечания отправлены. Заказ возвращен в работу.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить замечания");
    } finally {
      setBusy(false);
    }
  }

  const selectedCount = req.selectedProviderIds?.length ?? 0;
  const pendingInfo =
    !isOrderStatus && selectedCount > 0 && req.lastSelectionAt
      ? selectedCount === 1
        ? `Вы выбрали исполнителя · ${formatDate(req.lastSelectionAt)}`
        : `Вы выбрали исполнителей: ${selectedCount} · ${formatDate(req.lastSelectionAt)}`
      : null;

  return (
    <ChatBodyWithSidePanelLayout
      middle={
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
              <Typography variant="h4" fontWeight={700}>
                Заявка
              </Typography>
              <Chip size="small" label={getServiceRequestStatusLabel(req.status)} />
            </Stack>
            <Typography color="text.secondary">{pickTitle(req)}</Typography>
            {req.message ? <Typography sx={{ whiteSpace: "pre-wrap" }}>{req.message}</Typography> : null}
          </Stack>

          {notice ? <Alert severity="success">{notice}</Alert> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}

          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
                <Typography fontWeight={800}>Детали</Typography>
              </Stack>
              <StatusProgressStepper
                steps={buildServiceRequestFlowSteps(req.status, activeOffer)}
                activeStepId={getServiceRequestFlowActiveStepId(req.status, activeOffer)}
              />
              {pendingInfo ? (
                <Typography variant="body2" color="text.secondary">
                  {pendingInfo}
                </Typography>
              ) : null}
              {!isOrderStatus && (req.status === "NEW" || req.status === "DISCUSSING") && req.dealTerms ? (
                <Button
                  variant="contained"
                  color="success"
                  disabled={busy}
                  onClick={() => void acceptTerms()}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Согласовать условия
                </Button>
              ) : null}
              {!isOrderStatus && req.status === "PROVIDER_SELECTED" ? (
                <Button
                  variant="contained"
                  color="success"
                  disabled={busy}
                  onClick={() => {
                    setOfferOpen(true);
                    setOfferAccepted(false);
                    if (!offerMarkdown && !offerBusy) void loadOffer();
                  }}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Заключить договор и начать выполнение
                </Button>
              ) : null}
              {!isOrderStatus && (req.status === "CONTRACT_ACCEPTED" || req.status === "PAYMENT_PENDING") ? (
                <Button
                  variant="contained"
                  color="warning"
                  disabled={busy}
                  onClick={() => void payEscrow()}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Оплатить (средства будут зарезервированы)
                </Button>
              ) : null}
              {req.status === "ACCEPTANCE_PENDING" ? (
                <Stack spacing={1} sx={{ pt: 1 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button variant="contained" color="success" disabled={busy} onClick={() => void acceptResult()}>
                      Принять результат
                    </Button>
                    <Button variant="outlined" color="warning" disabled={busy} onClick={() => void sendRemarks()}>
                      Отправить замечания
                    </Button>
                  </Stack>
                  <TextField
                    label="Замечания"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    minRows={3}
                    multiline
                    disabled={busy}
                  />
                  {req.autoAcceptAt ? (
                    <Typography variant="body2" color="text.secondary">
                      Автопринятие: {formatDate(req.autoAcceptAt)}
                    </Typography>
                  ) : null}
                </Stack>
              ) : null}
              {/* advance flow removed */}
              {req.location ? <Typography color="text.secondary">Локация: {req.location}</Typography> : null}

              {isOrderStatus ? (
                <Button component={Link} href={`/orders/${req.id}`} variant="contained" color="success" sx={{ mt: 1, alignSelf: "flex-start" }}>
                  Открыть заказ
                </Button>
              ) : null}
            </Stack>
          </Paper>

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
                  const rowCanInitiate =
                    req.status === "TERMS_AGREED" ? isSelected : canInitiateOrderFor(c.providerId);

                  return (
                    <ListItem
                      key={c.conversationId}
                      disablePadding
                      secondaryAction={
                        isOrderStatus || req.status === "CLOSED" ? null : (
                          <Stack direction="row" spacing={1} sx={{ pr: 1 }}>
                            <Button
                              color="secondary"
                              size="small"
                              variant="contained"
                              disabled={!rowCanInitiate || busy}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (req.status === "TERMS_AGREED") {
                                  void selectProvider(c.providerId);
                                } else {
                                  void initiateOrder(c.conversationId);
                                }
                              }}
                              sx={{ whiteSpace: "nowrap" }}
                            >
                              {req.status === "TERMS_AGREED"
                                ? "Подтвердить выбор"
                                : isDeclined
                                  ? "Выбрать снова"
                                  : "Выбрать исполнителя"}
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
                    ? `Я согласен(на) с офертой версии ${offerVersion} и условиями сделки`
                    : "Я согласен(на) с офертой и условиями сделки"
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

