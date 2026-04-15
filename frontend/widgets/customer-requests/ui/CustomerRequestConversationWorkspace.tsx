"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import type { ChatServiceRequestConversationListItemDto } from "@/entities/chat/dto/chat.dto";
import type { ServiceRequestCustomerDto } from "@/entities/service-request";
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

  const isOrderStatus =
    req.status === "ACTIVE" || req.status === "COMPLETED" || req.status === "CANCELLED" || req.status === "CONVERTED_TO_ORDER";

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
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Заявка
            </Typography>
            <Typography color="text.secondary">{pickTitle(req)}</Typography>
          </Box>

          {notice ? <Alert severity="success">{notice}</Alert> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}

          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
                <Typography fontWeight={800}>Детали</Typography>
                <Chip size="small" label={req.status} />
              </Stack>
              {pendingInfo ? (
                <Typography variant="body2" color="text.secondary">
                  {pendingInfo}
                </Typography>
              ) : null}
              {req.location ? <Typography color="text.secondary">Локация: {req.location}</Typography> : null}
              {req.message ? <Typography color="text.secondary">{req.message}</Typography> : null}

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
                  const rowCanInitiate = canInitiateOrderFor(c.providerId);
                  const isSelected = (req.selectedProviderIds ?? []).includes(c.providerId);
                  const isDeclined = (req.declinedProviderIds ?? []).includes(c.providerId);

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
                                void initiateOrder(c.conversationId);
                              }}
                              sx={{ whiteSpace: "nowrap" }}
                            >
                              {isDeclined ? "Выбрать снова" : "Выбрать исполнителя"}
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

