"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Alert, Box, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type {
  ChatConversationAccessDto,
  ChatEnsureResponse,
  ChatMessageDto,
  ChatPostMessageResponse,
  ChatPresenceUpdatedPayload,
  ChatViewerSide,
} from "@/entities/chat/dto/chat.dto";
import { useChatSocket } from "@/widgets/chat/socket/ChatSocketContext";
import { Chat, type ChatRenderableRow, type ChatReplyTarget } from "./Chat";

type OutboundRow =
  | {
      type: "pending";
      clientMessageId: string;
      body: string;
      replyToMessageId?: string;
      replyToPreview?: { senderLabel: string; snippet: string };
    }
  | {
      type: "failed";
      clientMessageId: string;
      body: string;
      replyToMessageId?: string;
      replyToPreview?: { senderLabel: string; snippet: string };
      error?: string;
    };

function mergeServerMessages(prev: ChatMessageDto[], incoming: ChatMessageDto): ChatMessageDto[] {
  if (prev.some((m) => m.id === incoming.id)) {
    return prev;
  }
  return [...prev].concat(incoming).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

type Props = {
  serviceRequestId: string;
  conversationId?: string;
  title?: string;
  subtitle?: string;
};

export function ServiceRequestChatPanel({ serviceRequestId, conversationId: forcedConversationId, title = "Чат", subtitle }: Props) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";

  const { socket, socketConnected, setOpenConversationId, joinConversationRoom, clearUnreadForRequest } = useChatSocket();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [serverMessages, setServerMessages] = useState<ChatMessageDto[]>([]);
  const [outbound, setOutbound] = useState<OutboundRow[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingReply, setPendingReply] = useState<ChatReplyTarget | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [canWrite, setCanWrite] = useState(true);
  const [readOnlyReason, setReadOnlyReason] = useState<string | null>(null);
  const [viewerSide, setViewerSide] = useState<ChatViewerSide | null>(null);
  const [peerOnline, setPeerOnline] = useState(false);
  const [presenceReady, setPresenceReady] = useState(false);
  const prevPeerOnlineRef = useRef(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [headerFlash, setHeaderFlash] = useState(false);
  const [indicatorTone, setIndicatorTone] = useState<"secondary" | "info" | "primary">("secondary");
  const indicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const serverMessagesRef = useRef<ChatMessageDto[]>([]);
  useEffect(() => {
    serverMessagesRef.current = serverMessages;
  }, [serverMessages]);

  const rows: ChatRenderableRow[] = useMemo(() => {
    const serverRows: ChatRenderableRow[] = serverMessages.map((message) => ({ kind: "message", message }));
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
          replyToPreview: o.replyToPreview,
        };
      });
    return [...serverRows, ...tail];
  }, [serverMessages, outbound]);

  const loadMessages = useCallback(async (convId: string, mode: "initial" | "tail") => {
    const last = serverMessagesRef.current[serverMessagesRef.current.length - 1];
    const search =
      mode === "tail" && last
        ? new URLSearchParams({ after: last.id, limit: "50" })
        : new URLSearchParams({ limit: "50" });
    const response = await fetch(`/api/chat/conversations/${convId}/messages?${search.toString()}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as ChatMessageDto[] | { error?: string } | null;
    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && !Array.isArray(payload) && payload.error
          ? payload.error
          : "Не удалось загрузить сообщения";
      throw new Error(message);
    }
    const list = (payload ?? []) as ChatMessageDto[];
    if (mode === "initial") {
      setServerMessages([...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
    } else {
      setServerMessages((prev) => {
        let next = [...prev];
        for (const item of list) {
          next = mergeServerMessages(next, item);
        }
        return next;
      });
    }
  }, []);

  const markRead = useCallback(
    async (convId: string) => {
      const response = await fetch(`/api/chat/conversations/${convId}/read`, { method: "POST" }).catch(() => null);
      if (response?.ok) clearUnreadForRequest(serviceRequestId);
    },
    [clearUnreadForRequest, serviceRequestId]
  );

  useEffect(() => {
    let cancelled = false;

    setConversationId(null);
    setOpenConversationId(null);
    setServerMessages([]);
    setOutbound([]);
    setDraft("");
    setPendingReply(null);
    setBootError(null);
    setCanWrite(true);
    setReadOnlyReason(null);
    setLoading(true);

    (async () => {
      try {
        async function loadAccess(convId: string) {
          const response = await fetch(`/api/chat/conversations/${convId}/access`, { cache: "no-store" }).catch(() => null);
          if (!response?.ok) return;
          const payload = (await response.json().catch(() => null)) as ChatConversationAccessDto | null;
          if (!payload || typeof payload !== "object") return;
          setCanWrite(Boolean(payload.canWrite));
          setReadOnlyReason(!payload.canWrite ? (payload.reason ? String(payload.reason) : "Отправка сообщений недоступна") : null);
        }

        if (forcedConversationId) {
          if (cancelled) return;
          setConversationId(forcedConversationId);
          setOpenConversationId(forcedConversationId);
          void loadAccess(forcedConversationId);
          await loadMessages(forcedConversationId, "initial");
          if (cancelled) return;
          await markRead(forcedConversationId);
          return;
        }

        const ensureResponse = await fetch("/api/chat/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceRequestId }),
        });
        const ensurePayload = (await ensureResponse.json().catch(() => null)) as
          | ChatEnsureResponse
          | { error?: string; message?: string }
          | null;

        if (!ensureResponse.ok) {
          const message =
            ensurePayload && typeof ensurePayload === "object" && "error" in ensurePayload
              ? String(ensurePayload.error ?? "Чат недоступен")
              : "Чат недоступен";
          throw new Error(message);
        }

        const convId = (ensurePayload as ChatEnsureResponse).conversationId;
        if (cancelled) return;

        setConversationId(convId);
        setOpenConversationId(convId);
        void loadAccess(convId);

        await loadMessages(convId, "initial");
        if (cancelled) return;
        await markRead(convId);
      } catch (e) {
        if (!cancelled) {
          setBootError(e instanceof Error ? e.message : "Не удалось открыть чат");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      setOpenConversationId(null);
    };
  }, [serviceRequestId, forcedConversationId, loadMessages, markRead, setOpenConversationId]);

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
      setOutbound((prev) => prev.filter((o) => o.clientMessageId !== msg.clientMessageId));
    };
    socket?.on("message.created", handler);
    return () => {
      socket?.off("message.created", handler);
    };
  }, [conversationId, socket]);

  useEffect(() => {
    if (!conversationId || !viewerSide) {
      return;
    }
    const handler = (payload: ChatPresenceUpdatedPayload) => {
      if (payload.conversationId !== conversationId) return;
      setPeerOnline(viewerSide === "customer" ? payload.providerOnline : payload.customerOnline);
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
    async (body: string, replyToMessageId: string | undefined, clientMessageId: string) => {
      if (!conversationId) return;
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          clientMessageId,
          replyToMessageId: replyToMessageId ?? undefined,
        }),
      });
      const payload = (await response.json().catch(() => null)) as ChatPostMessageResponse | { error?: string } | null;
      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String(payload.error ?? "Ошибка отправки")
            : "Ошибка отправки";
        throw new Error(message);
      }
      const data = payload as ChatPostMessageResponse;
      setServerMessages((prev) => mergeServerMessages(prev, data.message));
      setOutbound((prev) => prev.filter((o) => o.clientMessageId !== clientMessageId));
    },
    [conversationId]
  );

  const handleSend = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed || !conversationId || sending || !canWrite) {
      return;
    }
    const clientMessageId = crypto.randomUUID();
    const replyToMessageId = pendingReply?.messageId;
    const replyToPreview = pendingReply ? { senderLabel: pendingReply.senderLabel, snippet: pendingReply.bodySnippet } : undefined;

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
      const message = e instanceof Error ? e.message : "Ошибка отправки";
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
            error: message,
          };
        })
      );
    } finally {
      setSending(false);
    }
  }, [conversationId, draft, pendingReply, postOutbound, sending, canWrite]);

  const handleRetry = useCallback(
    async (clientMessageId: string) => {
      const row = outbound.find((o) => o.clientMessageId === clientMessageId && o.type === "failed");
      if (!row || row.type !== "failed") return;
      setOutbound((prev) =>
        prev.map((o) => {
          if (o.clientMessageId !== clientMessageId || o.type !== "failed") return o;
          return {
            type: "pending" as const,
            clientMessageId: o.clientMessageId,
            body: o.body,
            replyToMessageId: o.replyToMessageId,
            replyToPreview: o.replyToPreview,
          };
        })
      );
      setSending(true);
      try {
        await postOutbound(row.body, row.replyToMessageId, clientMessageId);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Ошибка отправки";
        setOutbound((prev) =>
          prev.map((o) => {
            if (o.clientMessageId !== clientMessageId || o.type !== "pending") return o;
            return {
              type: "failed" as const,
              clientMessageId: o.clientMessageId,
              body: o.body,
              replyToMessageId: o.replyToMessageId,
              replyToPreview: o.replyToPreview,
              error: message,
            };
          })
        );
      } finally {
        setSending(false);
      }
    },
    [outbound, postOutbound]
  );

  const handleReplyToMessage = useCallback((message: ChatMessageDto) => {
    const snippet = message.body.length > 160 ? `${message.body.slice(0, 160)}…` : message.body;
    setPendingReply({
      messageId: message.id,
      senderLabel: message.senderName ?? "Участник",
      bodySnippet: snippet,
    });
  }, []);

  return (
    <Paper
      variant="outlined"
      sx={{ height: "100%", minHeight: 420, display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      <Box
        sx={(theme) => ({
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderBottomColor: "divider",
          position: "relative",
          overflow: "hidden",
          ...(headerFlash
            ? {
                "@keyframes chatHeaderShine": {
                  "0%": { transform: "translateX(-140%) skewX(-20deg)", opacity: 0 },
                  "15%": { opacity: 0.65 },
                  "100%": { transform: "translateX(260%) skewX(-20deg)", opacity: 0 },
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
                  "&::after": { animation: "none", opacity: 0 },
                },
              }
            : null),
        })}
      >
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
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
          <Typography variant="h6" sx={{
            fontWeight: 800
          }}>
            {title}
          </Typography>
        </Stack>
        {subtitle ? (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>

      {!bootError && !canWrite ? (
        <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid", borderBottomColor: "divider" }}>
          <Alert severity="info" variant="outlined">
            {readOnlyReason ?? "Этот диалог доступен только для просмотра."}
          </Alert>
        </Box>
      ) : null}

      <Box sx={{ flex: 1, minHeight: 0 }}>
        {bootError ? (
          <Typography color="error" variant="body2">
            {bootError}
          </Typography>
        ) : (
          <Chat
            rows={rows}
            currentUserId={currentUserId}
            draft={draft}
            onDraftChange={setDraft}
            pendingReply={pendingReply}
            onPendingReplyChange={setPendingReply}
            onSend={() => void handleSend()}
            onRetry={(id) => void handleRetry(id)}
            onReplyToMessage={handleReplyToMessage}
            disabled={!conversationId || !canWrite}
            sending={sending}
            loading={loading}
            readOnly={!canWrite}
          />
        )}
      </Box>

      {!socketConnected ? (
        <Stack sx={{ px: 2, py: 1, borderTop: "1px solid", borderTopColor: "divider" }}>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            Соединение с чатом: нет. Сообщения будут догружаться при возвращении/по таймеру.
          </Typography>
        </Stack>
      ) : null}
    </Paper>
  );
}

