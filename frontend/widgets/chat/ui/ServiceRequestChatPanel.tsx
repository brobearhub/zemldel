"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Box, Button, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import { alpha } from "@mui/material/styles";
import type {
  ChatConversationAccessDto,
  ChatEnsureResponse,
  ChatMessageDto,
  ChatPostMessageResponse,
  ChatPresenceUpdatedPayload,
  ChatViewerSide,
} from "@/entities/chat/dto/chat.dto";
import type { RequestCustomerDto, RequestProDto } from "@/entities/request";
import { useChatSocket } from "@/widgets/chat/socket/ChatSocketContext";
import { Chat, type ChatRenderableRow, type ChatReplyTarget } from "./Chat";
import {
  createClosedChatAccess,
  resolveChatAccess,
  resolveChatError,
  resolveChatPostFailure,
} from "@/widgets/chat/model/chat-access";
import { ChatReadOnlyNotice } from "./ChatReadOnlyNotice";
import { useVisibleRefresh } from "@/shared/lib/use-visible-refresh";
import { CHAT_ARCHIVED_REASON_CODE } from "@/widgets/chat/model/chat-access";
import {
  useChatOutbox,
  type OutboundRow,
} from "@/widgets/chat/model/use-chat-outbox";
import { DownloadChatPdfButton } from "./DownloadChatPdfButton";
import { useChatDraft } from "@/widgets/chat/model/use-chat-draft";

class ChatPostError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly reasonCode?: string,
  ) {
    super(message);
  }
}

function mergeServerMessages(
  prev: ChatMessageDto[],
  incoming: ChatMessageDto,
): ChatMessageDto[] {
  if (prev.some((m) => m.id === incoming.id)) {
    return prev;
  }
  return [...prev]
    .concat(incoming)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}

type Props = {
  serviceRequestId?: string;
  conversationId?: string;
  title?: string;
  subtitle?: string;
  autoFocusInput?: boolean;
  requestLockedAt?: string | null;
  selectedProviderId?: string | null;
  requestArchived?: boolean;
  onOpenSelectedConversation?: () => void;
  appearance?: "default" | "messenger";
  initialUnreadCount?: number;
  onMessage?: (message: ChatMessageDto) => void;
  onCollapse?: () => void;
  viewerRole?: "CUSTOMER" | "PROVIDER";
  counterpartyName?: string | null;
  requestInfo?: RequestCustomerDto | RequestProDto;
};

export function ServiceRequestChatPanel({
  serviceRequestId = "direct",
  conversationId: forcedConversationId,
  title = "Чат",
  subtitle,
  autoFocusInput,
  requestLockedAt,
  selectedProviderId,
  requestArchived = false,
  onOpenSelectedConversation,
  appearance = "default",
  initialUnreadCount = 0,
  onMessage,
  onCollapse,
  viewerRole,
  counterpartyName,
  requestInfo,
}: Props) {
  const openingUnreadCount = useRef(initialUnreadCount);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";

  const {
    socket,
    socketConnected,
    setOpenConversationId,
    joinConversationRoom,
    clearUnreadForConversation,
  } = useChatSocket();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [serverMessages, setServerMessages] = useState<ChatMessageDto[]>([]);
  const [outbound, setOutbound] = useChatOutbox(
    currentUserId,
    serviceRequestId,
    forcedConversationId ?? "default",
  );
  const [draft, setDraft] = useChatDraft(
    currentUserId,
    serviceRequestId,
    forcedConversationId ?? "default",
  );
  const [pendingReply, setPendingReply] = useState<ChatReplyTarget | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [bootAttempt, setBootAttempt] = useState(0);
  const [serverAccess, setAccess] = useState(createClosedChatAccess);
  const access = requestArchived
    ? resolveChatAccess({
        canRead: true,
        canWrite: false,
        reasonCode: CHAT_ARCHIVED_REASON_CODE,
      })
    : serverAccess;
  const [viewerSide, setViewerSide] = useState<ChatViewerSide | null>(null);
  const [peerOnline, setPeerOnline] = useState(false);
  const [presenceReady, setPresenceReady] = useState(false);
  const prevPeerOnlineRef = useRef(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [headerFlash, setHeaderFlash] = useState(false);
  const [indicatorTone, setIndicatorTone] = useState<
    "secondary" | "info" | "primary"
  >("secondary");
  const indicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const serverMessagesRef = useRef<ChatMessageDto[]>([]);
  useEffect(() => {
    serverMessagesRef.current = serverMessages;
  }, [serverMessages]);

  useEffect(() => {
    const delivered = new Set(
      serverMessages.map((message) => message.clientMessageId),
    );
    if (outbound.some((row) => delivered.has(row.clientMessageId))) {
      setOutbound((previous) =>
        previous.filter((row) => !delivered.has(row.clientMessageId)),
      );
    }
  }, [serverMessages, outbound, setOutbound]);

  const rows: ChatRenderableRow[] = useMemo(() => {
    const serverRows: ChatRenderableRow[] = serverMessages.map((message) => ({
      kind: "message",
      message,
    }));
    const pendingKeys = new Set(serverMessages.map((m) => m.clientMessageId));
    const tail = outbound
      .filter((o) => !pendingKeys.has(o.clientMessageId))
      .map((o): ChatRenderableRow => {
        if (o.type === "pending") {
          return {
            kind: "pending",
            clientMessageId: o.clientMessageId,
            body: o.body,
            replyToPreview: o.replyToPreview,
          };
        }
        return {
          kind: "failed",
          clientMessageId: o.clientMessageId,
          body: o.body,
          error: o.error,
          retryable: o.retryable,
          replyToPreview: o.replyToPreview,
        };
      });
    return [...serverRows, ...tail];
  }, [serverMessages, outbound]);

  const loadMessages = useCallback(
    async (convId: string, mode: "initial" | "tail", signal?: AbortSignal) => {
      const last =
        serverMessagesRef.current[serverMessagesRef.current.length - 1];
      const search =
        mode === "tail" && last
          ? new URLSearchParams({ after: last.id, limit: "50" })
          : new URLSearchParams({ limit: "50" });
      let cursor = mode === "tail" ? last?.id : undefined;
      const all: ChatMessageDto[] = [];
      for (;;) {
        if (cursor) search.set("after", cursor);
        const response = await fetch(
          `/api/chat/conversations/${convId}/messages?${search.toString()}`,
          {
            cache: "no-store",
            signal,
          },
        );
        const payload = (await response.json().catch(() => null)) as
          ChatMessageDto[] | { error?: string } | null;
        if (!response.ok) {
          const message =
            payload &&
            typeof payload === "object" &&
            !Array.isArray(payload) &&
            payload.error
              ? payload.error
              : "Не удалось загрузить сообщения";
          throw new Error(message);
        }
        const page = (payload ?? []) as ChatMessageDto[];
        if (signal?.aborted) return;
        all.push(...page);
        const next = page[page.length - 1]?.id;
        if (mode !== "tail" || !cursor || page.length < 50 || next === cursor)
          break;
        cursor = next;
      }
      const list = all;
      if (mode === "initial") {
        setServerMessages(
          [...list].sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          ),
        );
      } else {
        setServerMessages((prev) => {
          let next = [...prev];
          for (const item of list) {
            next = mergeServerMessages(next, item);
          }
          return next;
        });
      }
    },
    [],
  );

  const markRead = useCallback(
    async (convId: string) => {
      const response = await fetch(`/api/chat/conversations/${convId}/read`, {
        method: "POST",
      }).catch(() => null);
      if (response?.ok) clearUnreadForConversation(convId);
    },
    [clearUnreadForConversation],
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    setConversationId(null);
    setOpenConversationId(null);
    setServerMessages([]);
    setPendingReply(null);
    setBootError(null);
    setAccess(createClosedChatAccess());
    setLoading(true);

    (async () => {
      try {
        async function loadAccess(convId: string) {
          const response = await fetch(
            `/api/chat/conversations/${convId}/access`,
            { cache: "no-store" },
          ).catch(() => null);
          if (!response?.ok) {
            if (!cancelled) setAccess(resolveChatAccess(null));
            return;
          }
          const payload = (await response
            .json()
            .catch(() => null)) as ChatConversationAccessDto | null;
          if (!cancelled) setAccess(resolveChatAccess(payload));
        }

        if (forcedConversationId) {
          if (cancelled) return;
          setConversationId(forcedConversationId);
          setOpenConversationId(forcedConversationId);
          await loadAccess(forcedConversationId);
          await loadMessages(
            forcedConversationId,
            "initial",
            controller.signal,
          );
          if (cancelled) return;
          await markRead(forcedConversationId);
          return;
        }

        const ensureResponse = await fetch("/api/chat/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceRequestId }),
        });
        const ensurePayload = (await ensureResponse
          .json()
          .catch(() => null)) as
          ChatEnsureResponse | { error?: string; message?: string } | null;

        if (!ensureResponse.ok) {
          const message =
            ensurePayload &&
            typeof ensurePayload === "object" &&
            "error" in ensurePayload
              ? String(ensurePayload.error ?? "Чат недоступен")
              : "Чат недоступен";
          throw new Error(message);
        }

        const convId = (ensurePayload as ChatEnsureResponse).conversationId;
        if (cancelled) return;

        setConversationId(convId);
        setOpenConversationId(convId);
        await loadAccess(convId);

        await loadMessages(convId, "initial", controller.signal);
        if (cancelled) return;
        await markRead(convId);
      } catch (e) {
        if (!cancelled) {
          setBootError(
            e instanceof Error ? e.message : "Не удалось открыть чат",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      setOpenConversationId(null);
    };
  }, [
    serviceRequestId,
    forcedConversationId,
    bootAttempt,
    requestLockedAt,
    selectedProviderId,
    requestArchived,
    loadMessages,
    markRead,
    setOpenConversationId,
  ]);

  const refreshAccess = useVisibleRefresh({
    requestId: serviceRequestId,
    scope: `${serviceRequestId}:${conversationId}:${requestLockedAt}:${selectedProviderId}:${requestArchived}`,
    paused: !conversationId || loading,
    onRefresh: async (signal) => {
      try {
        const response = await fetch(
          `/api/chat/conversations/${conversationId}/access`,
          { cache: "no-store", signal },
        );
        const payload = response.ok
          ? ((await response.json()) as ChatConversationAccessDto)
          : null;
        if (!signal.aborted) setAccess(resolveChatAccess(payload));
      } catch {
        if (!signal.aborted) setAccess(resolveChatAccess(null));
      }
    },
  });
  const refreshMessages = useVisibleRefresh({
    scope: `messages:${serviceRequestId}:${conversationId}:${requestLockedAt}:${selectedProviderId}:${requestArchived}`,
    paused: !conversationId || loading,
    onRefresh: async (signal) => {
      if (!conversationId) return;
      await loadMessages(conversationId, "tail", signal);
      if (!signal.aborted) {
        setBootError(null);
        await markRead(conversationId);
      }
    },
  });
  useEffect(() => {
    if (socketConnected) {
      refreshAccess();
      refreshMessages();
    }
  }, [socketConnected, refreshAccess, refreshMessages]);

  useEffect(() => {
    if (!conversationId || !socketConnected) {
      return;
    }
    // reset per-conversation presence state before join snapshot arrives
    setPresenceReady(false);
    setHeaderFlash(false);
    setViewerSide(null);
    setPeerOnline(false);
    prevPeerOnlineRef.current = false;
    setIndicatorTone("secondary");
    if (indicatorTimerRef.current) {
      clearTimeout(indicatorTimerRef.current);
      indicatorTimerRef.current = null;
    }

    let cancelled = false;
    void (async () => {
      const ack = await joinConversationRoom(conversationId);
      if (cancelled) return;
      if (ack.ok) {
        setViewerSide(ack.viewerSide);
        setPeerOnline(ack.peerOnline);
        prevPeerOnlineRef.current = ack.peerOnline; // avoid flashing on initial snapshot
        setIndicatorTone(ack.peerOnline ? "primary" : "secondary");
        setPresenceReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, socketConnected, joinConversationRoom]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }
    const handler = (msg: ChatMessageDto) => {
      if (msg.conversationId !== conversationId) {
        return;
      }
      setServerMessages((prev) => mergeServerMessages(prev, msg));
      if (document.visibilityState === "visible") void markRead(conversationId);
      setOutbound((prev) =>
        prev.filter((o) => o.clientMessageId !== msg.clientMessageId),
      );
    };
    const changed = (event: { conversationId: string }) => { if (event.conversationId === conversationId) refreshAccess(); };
    socket?.on("conversation.changed", changed);
    socket?.on("message.created", handler);
    return () => {
      socket?.off("conversation.changed", changed);
      socket?.off("message.created", handler);
    };
  }, [conversationId, socket, setOutbound, markRead, refreshAccess]);

  useEffect(() => {
    if (!conversationId || !viewerSide) {
      return;
    }
    const handler = (payload: ChatPresenceUpdatedPayload) => {
      if (payload.conversationId !== conversationId) return;
      setPeerOnline(
        viewerSide === "customer"
          ? payload.providerOnline
          : payload.customerOnline,
      );
    };
    socket?.on("presence.updated", handler);
    return () => {
      socket?.off("presence.updated", handler);
    };
  }, [conversationId, socket, viewerSide]);

  useEffect(() => {
    if (!presenceReady) {
      prevPeerOnlineRef.current = peerOnline;
      return;
    }
    const prev = prevPeerOnlineRef.current;
    prevPeerOnlineRef.current = peerOnline;
    if (prev === peerOnline) return;

    // indicator: online/offline transition via info with 1s pause
    setIndicatorTone("info");
    if (indicatorTimerRef.current) {
      clearTimeout(indicatorTimerRef.current);
    }
    indicatorTimerRef.current = setTimeout(() => {
      setIndicatorTone(peerOnline ? "primary" : "secondary");
      indicatorTimerRef.current = null;
    }, 1000);

    // header shine: only when peer comes online; run twice
    if (!prev && peerOnline) {
      setHeaderFlash(false); // restart animation even if already true
      setTimeout(() => setHeaderFlash(true), 0);
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
      }
      flashTimerRef.current = setTimeout(() => {
        setHeaderFlash(false);
        flashTimerRef.current = null;
      }, 1350);
    }
  }, [peerOnline, presenceReady]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
        flashTimerRef.current = null;
      }
      if (indicatorTimerRef.current) {
        clearTimeout(indicatorTimerRef.current);
        indicatorTimerRef.current = null;
      }
    };
  }, []);

  const postOutbound = useCallback(
    async (
      body: string,
      replyToMessageId: string | undefined,
      clientMessageId: string,
    ) => {
      if (!conversationId) return;
      const response = await fetch(
        `/api/chat/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body,
            clientMessageId,
            replyToMessageId: replyToMessageId ?? undefined,
          }),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | ChatPostMessageResponse
        | { code?: string; error?: string; message?: string }
        | null;
      if (!response.ok) {
        const error = resolveChatError(payload);
        throw new ChatPostError(error.message, error.retryable, error.reasonCode);
      }
      const data = payload as ChatPostMessageResponse;
      setServerMessages((prev) => mergeServerMessages(prev, data.message));
      onMessage?.(data.message);
      refreshAccess();
      setOutbound((prev) =>
        prev.filter((o) => o.clientMessageId !== clientMessageId),
      );
    },
    [conversationId, onMessage, setOutbound, refreshAccess],
  );

  const applyPostFailure = useCallback((error: unknown) => {
    const failure = resolveChatPostFailure({
      message: error instanceof Error ? error.message : "Ошибка отправки",
      retryable: error instanceof ChatPostError ? error.retryable : true,
      reasonCode: error instanceof ChatPostError ? error.reasonCode : undefined,
    });
    if (failure.access) {
      setAccess(failure.access);
    }
    return failure;
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed || !conversationId || sending || !access.canWrite) {
      return;
    }
    const clientMessageId = crypto.randomUUID();
    const replyToMessageId = pendingReply?.messageId;
    const replyToPreview = pendingReply
      ? {
          senderLabel: pendingReply.senderLabel,
          snippet: pendingReply.bodySnippet,
        }
      : undefined;

    setOutbound((prev) => [
      ...prev,
      {
        type: "pending",
        clientMessageId,
        body: trimmed,
        replyToMessageId,
        replyToPreview,
      },
    ]);
    setDraft("");
    setPendingReply(null);
    setSending(true);
    try {
      await postOutbound(trimmed, replyToMessageId, clientMessageId);
    } catch (e) {
      const failure = applyPostFailure(e);
      setOutbound((prev) =>
        prev.map((o) => {
          if (o.clientMessageId !== clientMessageId || o.type !== "pending") {
            return o;
          }
          return {
            type: "failed" as const,
            clientMessageId: o.clientMessageId,
            body: o.body,
            replyToMessageId: o.replyToMessageId,
            replyToPreview: o.replyToPreview,
            error: failure.message,
            retryable: failure.retryable,
          };
        }),
      );
    } finally {
      setSending(false);
    }
  }, [
    access.canWrite,
    applyPostFailure,
    conversationId,
    draft,
    pendingReply,
    postOutbound,
    sending,
    setDraft,
    setOutbound,
  ]);

  const handleRetry = useCallback(
    async (clientMessageId: string) => {
      if (!access.canWrite || sending) return;
      const row = outbound.find(
        (o) => o.clientMessageId === clientMessageId && o.type === "failed",
      );
      if (!row || row.type !== "failed" || !row.retryable) return;
      setOutbound((prev) =>
        prev.map((o) => {
          if (o.clientMessageId !== clientMessageId || o.type !== "failed")
            return o;
          return {
            type: "pending" as const,
            clientMessageId: o.clientMessageId,
            body: o.body,
            replyToMessageId: o.replyToMessageId,
            replyToPreview: o.replyToPreview,
          };
        }),
      );
      setSending(true);
      try {
        await postOutbound(row.body, row.replyToMessageId, clientMessageId);
      } catch (e) {
        const failure = applyPostFailure(e);
        setOutbound((prev) =>
          prev.map((o) => {
            if (o.clientMessageId !== clientMessageId || o.type !== "pending")
              return o;
            return {
              type: "failed" as const,
              clientMessageId: o.clientMessageId,
              body: o.body,
              replyToMessageId: o.replyToMessageId,
              replyToPreview: o.replyToPreview,
              error: failure.message,
              retryable: failure.retryable,
            };
          }),
        );
      } finally {
        setSending(false);
      }
    },
    [
      applyPostFailure,
      outbound,
      postOutbound,
      access.canWrite,
      sending,
      setOutbound,
    ],
  );

  const handleReplyToMessage = useCallback(
    (message: ChatMessageDto) => {
      if (!access.canWrite) return;
      const snippet =
        message.body.length > 160
          ? `${message.body.slice(0, 160)}…`
          : message.body;
      setPendingReply({
        messageId: message.id,
        senderLabel: message.senderName ?? "Участник",
        bodySnippet: snippet,
      });
    },
    [access.canWrite],
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        height:
          appearance === "messenger"
            ? "100%"
            : {
                xs: "auto",
                tablet: "100%",
              },
        minHeight:
          appearance === "messenger"
            ? 0
            : {
                xs: 0,
                tablet: 420,
              },
        flex: appearance === "messenger" ? 1 : undefined,
        border: 0,
        outline:
          appearance === "messenger"
            ? "none"
            : (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
        borderRadius: appearance === "messenger" ? 0 : undefined,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box
        sx={(theme) => ({
          display: appearance === "messenger" ? "none" : undefined,
          px: 2,
          py: 1.5,
          bgcolor: "background.secondary",
          color: "text.primary",
          borderBottom: "1px solid",
          borderBottomColor: "divider",
          position: "relative",
          overflow: "hidden",
          ...(headerFlash
            ? {
                "@keyframes chatHeaderShine": {
                  "0%": {
                    transform: "translateX(-140%) skewX(-20deg)",
                    opacity: 0,
                  },
                  "15%": {
                    opacity: 0.65,
                  },
                  "100%": {
                    transform: "translateX(260%) skewX(-20deg)",
                    opacity: 0,
                  },
                },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: "38%",
                  background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.main, 0.22)}, transparent)`,
                  opacity: 0,
                  transform: "translateX(-140%) skewX(-20deg)",
                  animation: "chatHeaderShine 650ms ease-out 2",
                  animationFillMode: "both",
                  pointerEvents: "none",
                  willChange: "transform, opacity",
                },
                "@media (prefers-reduced-motion: reduce)": {
                  "&::after": {
                    animation: "none",
                    opacity: 0,
                  },
                },
              }
            : null),
        })}
      >
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            alignItems: "center",
          }}
        >
          {viewerSide ? (
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: `${indicatorTone}.main`,
                flex: "0 0 auto",
              }}
            />
          ) : null}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
            }}
          >
            {title}
          </Typography>
          <Box sx={{ ml: "auto" }}>
            <DownloadChatPdfButton conversationId={conversationId} serviceRequestId={serviceRequestId} title={subtitle || title} viewerRole={viewerRole} counterpartyName={counterpartyName} requestInfo={requestInfo} />
          </Box>
          {onCollapse ? (
            <Tooltip title="Свернуть чат">
              <IconButton
                aria-label="Свернуть чат"
                aria-expanded={true}
                onClick={onCollapse}
                size="small"
                sx={{
                  flexShrink: 0,
                  color: "inherit",
                }}
              >
                <ChevronRightRounded />
              </IconButton>
            </Tooltip>
          ) : null}
        </Stack>
        {subtitle ? (
          <Typography
            variant="body2"
            sx={{
              mt: 1,
              color: "text.secondary",
            }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Box>

      {!bootError && access.status !== "loading" && !access.canWrite ? (
        <Box
          sx={{
            px: 2,
            py: 1.25,
            borderBottom: "1px solid",
            borderBottomColor: "divider",
          }}
        >
          <ChatReadOnlyNotice
            message={
              access.message ?? "Этот диалог доступен только для просмотра."
            }
            reasonCode={access.reasonCode}
            onOpenSelectedConversation={onOpenSelectedConversation}
          />
        </Box>
      ) : null}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
        }}
      >
        {bootError ? (
          <Stack
            spacing={1}
            sx={{
              p: 2,
            }}
          >
            <Typography
              color="error"
              variant="body2"
            >
              {bootError}
            </Typography>
            <Button onClick={() => setBootAttempt((value) => value + 1)}>
              Повторить загрузку
            </Button>
          </Stack>
        ) : (
          <Chat
            rows={rows}
            currentUserId={currentUserId}
            currentUserImage={session?.user?.image}
            draft={draft}
            onDraftChange={setDraft}
            pendingReply={pendingReply}
            onPendingReplyChange={setPendingReply}
            onSend={() => void handleSend()}
            onRetry={(id) => void handleRetry(id)}
            onReplyToMessage={handleReplyToMessage}
            disabled={!conversationId || !access.canWrite}
            sending={sending}
            loading={loading}
            readOnly={!access.canWrite}
            autoFocusInput={autoFocusInput}
            appearance={appearance}
            initialUnreadCount={openingUnreadCount.current}
          />
        )}
      </Box>

      {!socketConnected ? (
        <Stack
          sx={{
            px: 2,
            py: 1,
            borderTop: "1px solid",
            borderTopColor: "divider",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
            }}
          >
            Соединение с чатом потеряно. Переписка обновится после
            восстановления связи.
          </Typography>
        </Stack>
      ) : null}
    </Paper>
  );
}
