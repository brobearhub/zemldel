"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchChatInbox,
  type ChatInboxRole,
} from "@/entities/chat/api/chat-inbox";
import type {
  ChatInboxItemDto,
  ChatMessageDto,
  ChatUnreadHintPayload,
} from "@/entities/chat/dto/chat.dto";
import { useChatSocket } from "@/widgets/chat/socket/ChatSocketContext";
import { useVisibleRefresh } from "@/shared/lib/use-visible-refresh";

function newestFirst(items: ChatInboxItemDto[]) {
  return [...items].sort(
    (a, b) =>
      (Date.parse(b.lastMessageAt ?? "") || 0) -
      (Date.parse(a.lastMessageAt ?? "") || 0),
  );
}

/** One inbox snapshot, updated by the existing socket; no polling or second connection. */
export function useChatInbox(scope: string, role: ChatInboxRole) {
  const { socket, unreadByConversationId } = useChatSocket();
  const [items, setItems] = useState<ChatInboxItemDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const revision = useRef(0);

  const refresh = useVisibleRefresh({
    scope: `chat-inbox:${role}:${scope}`,
    onRefresh: async (signal) => {
      const started = revision.current;
      try {
        const incoming = await fetchChatInbox(role);
        if (signal.aborted) return;
        setItems((current) =>
          newestFirst(
            incoming.map((row) => {
              // Do not let an HTTP response overwrite a newer socket preview.
              const live = current?.find(
                (item) => item.conversationId === row.conversationId,
              );
              return started !== revision.current &&
                live &&
                Date.parse(live.lastMessageAt ?? "") >
                  Date.parse(row.lastMessageAt ?? "")
                ? {
                    ...row,
                    lastMessageAt: live.lastMessageAt,
                    lastSnippet: live.lastSnippet,
                  }
                : row;
            }),
          ),
        );
        setError(null);
      } catch (reason) {
        if (!signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Не удалось загрузить чаты",
          );
      }
    },
  });

  const updatePreview = useCallback(
    (conversationId: string, at: string, snippet: string) => {
      revision.current += 1;
      setItems(
        (current) =>
          current &&
          newestFirst(
            current.map((row) =>
              row.conversationId === conversationId &&
              (!row.lastMessageAt ||
                Date.parse(at) >= Date.parse(row.lastMessageAt))
                ? { ...row, lastMessageAt: at, lastSnippet: snippet }
                : row,
            ),
          ),
      );
    },
    [],
  );

  const onMessage = useCallback(
    (message: ChatMessageDto) => {
      updatePreview(message.conversationId, message.createdAt, message.body);
    },
    [updatePreview],
  );

  useEffect(() => {
    const onHint = (hint: ChatUnreadHintPayload) => {
      if (
        !itemsRef.current?.some(
          (row) => row.conversationId === hint.conversationId,
        )
      ) {
        refresh(); // A newly created conversation needs its title and participant from the API.
        return;
      }
      updatePreview(
        hint.conversationId,
        hint.lastMessageAt,
        hint.bodySnippet ?? "Новое сообщение",
      );
    };
    socket?.on("chat.unreadHint", onHint);
    socket?.on("message.created", onMessage);
    socket?.on("request.changed", refresh);
    socket?.on("conversation.changed", refresh);
    return () => {
      socket?.off("chat.unreadHint", onHint);
      socket?.off("message.created", onMessage);
      socket?.off("request.changed", refresh);
      socket?.off("conversation.changed", refresh);
    };
  }, [socket, refresh, updatePreview, onMessage]);

  return { items, error, refresh, onMessage, unreadByConversationId };
}
