"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import type { ChatEnsureResponse, ChatMessageDto, ChatPostMessageResponse } from "@/entities/chat/dto/chat.dto";
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
    setLoading(true);

    (async () => {
      try {
        if (forcedConversationId) {
          if (cancelled) return;
          setConversationId(forcedConversationId);
          setOpenConversationId(forcedConversationId);
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
    void joinConversationRoom(conversationId);
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
    if (!trimmed || !conversationId || sending) {
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
  }, [conversationId, draft, pendingReply, postOutbound, sending]);

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
    <Paper variant="outlined" sx={{ height: "100%", minHeight: 420, display: "flex", flexDirection: "column" }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderBottomColor: "divider" }}>
        <Typography variant="h6" fontWeight={800}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Box>

      <Box sx={{ flex: 1, p: 2, minHeight: 0 }}>
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
            disabled={!conversationId}
            sending={sending}
            loading={loading}
          />
        )}
      </Box>

      {!socketConnected ? (
        <Stack sx={{ px: 2, py: 1, borderTop: "1px solid", borderTopColor: "divider" }}>
          <Typography variant="caption" color="text.secondary">
            Соединение с чатом: нет. Сообщения будут догружаться при возвращении/по таймеру.
          </Typography>
        </Stack>
      ) : null}
    </Paper>
  );
}

