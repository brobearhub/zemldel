"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { io, type Socket } from "socket.io-client";
import type {
  ChatJoinConversationAck,
  ChatInboxItemDto,
  ChatUnreadHintPayload,
} from "@/entities/chat/dto/chat.dto";
import { getChatSocketUrl } from "@/shared/config/chat-socket";
import {
  ChatSocketContext,
  type ChatSocketContextValue,
} from "./ChatSocketContext";

const TOKEN_REFRESH_MS = 240_000;

type Props = {
  readonly children: ReactNode;
};

function useInertValue(): ChatSocketContextValue {
  return {
    socket: null,
    socketConnected: false,
    unreadByRequestId: {},
    unreadByConversationId: {},
    clearUnreadForConversation: () => {},
    setOpenConversationId: () => {},
    clearUnreadForRequest: () => {},
    joinConversationRoom: async () => ({ ok: false, error: "Disconnected" }),
  };
}

export function ChatSocketProvider({ children }: Props) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const inert = useInertValue();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [unreadConversations, setUnreadConversations] = useState<
    Record<string, { requestId: string | null; count: number }>
  >({});
  const { unreadByRequestId, unreadByConversationId } = useMemo(() => {
    const requests: Record<string, number> = {};
    const conversations: Record<string, number> = {};
    for (const [id, entry] of Object.entries(unreadConversations)) {
      conversations[id] = entry.count;
      if (entry.requestId) requests[entry.requestId] =
        (requests[entry.requestId] ?? 0) + entry.count;
    }
    return {
      unreadByRequestId: requests,
      unreadByConversationId: conversations,
    };
  }, [unreadConversations]);

  useEffect(() => {
    setUnreadConversations({});
  }, [userId, status]);

  const openConversationIdRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const tokenRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setOpenConversationId = useCallback((conversationId: string | null) => {
    openConversationIdRef.current = conversationId;
  }, []);

  const unreadRevision = useRef(0);

  const clearUnreadForRequest = useCallback((requestId: string) => {
    unreadRevision.current += 1;
    setUnreadConversations((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([id, entry]) => [
          id,
          entry.requestId === requestId ? { ...entry, count: 0 } : entry,
        ]),
      ),
    );
  }, []);

  const clearUnreadForConversation = useCallback((conversationId: string) => {
    unreadRevision.current += 1;
    setUnreadConversations((prev) =>
      prev[conversationId]
        ? { ...prev, [conversationId]: { ...prev[conversationId], count: 0 } }
        : prev,
    );
  }, []);

  const applyUnreadHint = useCallback((hint: ChatUnreadHintPayload) => {
    if (hint.conversationId === openConversationIdRef.current) {
      return;
    }
    unreadRevision.current += 1;
    const id = hint.serviceRequestId ?? hint.subjectId;
    if (!id) return;
    setUnreadConversations((prev) => ({
      ...prev,
      [hint.conversationId]: {
        requestId: hint.subjectType === "direct" ? null : id,
        count: (prev[hint.conversationId]?.count ?? 0) + 1,
      },
    }));
  }, []);

  const inboxRole = session?.user?.accountKind === "PROVIDER" ? "provider" : "customer";
  useEffect(() => {
    if (!userId || !socketConnected) return;
    const controller = new AbortController();
    const restore = async () => {
      const revision = unreadRevision.current;
      try {
        const response = await fetch(`/api/chat/inbox?role=${inboxRole}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const items = await response.json() as ChatInboxItemDto[];
        if (controller.signal.aborted || revision !== unreadRevision.current || !Array.isArray(items)) return;
        setUnreadConversations(current => {
          const next = { ...current };
          for (const item of items) if (item.conversationId && item.unreadCount != null) next[item.conversationId] = { requestId: item.serviceRequestId, count: item.conversationId === openConversationIdRef.current ? 0 : item.unreadCount };
          return next;
        });
      } catch { /* Reconnect and focus retry the snapshot. */ }
    };
    void restore(); window.addEventListener("focus", restore);
    return () => { controller.abort(); window.removeEventListener("focus", restore); };
  }, [userId, inboxRole, socketConnected]);

  const joinConversationRoom = useCallback(async (conversationId: string) => {
    const s = socketRef.current;
    if (!s?.connected) {
      return {
        ok: false,
        error: "Disconnected",
      } satisfies ChatJoinConversationAck;
    }
    return await new Promise<ChatJoinConversationAck>((resolve) => {
      s.emit(
        "joinConversation",
        { conversationId },
        (ack: ChatJoinConversationAck | undefined) => {
          resolve(ack ?? { ok: false, error: "No ack" });
        },
      );
    });
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !userId) {
      setSocket(null);
      setSocketConnected(false);
      socketRef.current = null;
      if (tokenRefreshRef.current) {
        clearInterval(tokenRefreshRef.current);
        tokenRefreshRef.current = null;
      }
      return;
    }

    let cancelled = false;
    let refreshing = false;
    let retryDelay = 1000;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let tokenController: AbortController | undefined;
    const url = getChatSocketUrl();
    if (!url) return;
    const s = io(url, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
    });
    socketRef.current = s;
    setSocket(s);

    function scheduleRetry() {
      if (cancelled || retryTimer) return;
      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        void refreshToken();
      }, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 10_000);
    }

    async function refreshToken() {
      if (cancelled || refreshing) return;
      refreshing = true;
      const controller = new AbortController();
      tokenController = controller;
      const timeout = setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await fetch("/api/chat/socket-token", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as {
          token?: string;
        } | null;
        if (cancelled) return;
        if (!response.ok || !payload?.token) {
          // Authentication is recovered by the session layer; do not hammer it.
          if (response.status === 401 || response.status === 403) {
            if (s.connected) s.disconnect();
          } else scheduleRetry();
          return;
        }
        retryDelay = 1000;
        clearTimeout(retryTimer);
        retryTimer = undefined;
        s.auth = { token: payload.token };
        // Updating credentials must not interrupt a healthy connection or its rooms.
        if (!s.connected) s.connect();
      } catch {
        scheduleRetry();
      } finally {
        clearTimeout(timeout);
        refreshing = false;
      }
    }

    s.on("connect", () => {
      if (cancelled) return;
      setSocketConnected(true);
      window.dispatchEvent(new Event("request:sync"));
    });
    s.on("request.changed", (payload: { requestId: string }) => {
      window.dispatchEvent(
        new CustomEvent("request:changed", { detail: payload }),
      );
    });
    s.on("disconnect", (reason) => {
      setSocketConnected(false);
      if (reason === "io server disconnect") scheduleRetry();
    });
    s.on("connect_error", scheduleRetry);
    s.on("chat.unreadHint", (hint: ChatUnreadHintPayload) => {
      applyUnreadHint(hint);
    });

    const onOnline = () => {
      void refreshToken();
    };
    window.addEventListener("online", onOnline);
    void refreshToken();
    tokenRefreshRef.current = setInterval(onOnline, TOKEN_REFRESH_MS);

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      tokenController?.abort();
      window.removeEventListener("online", onOnline);
      if (tokenRefreshRef.current) {
        clearInterval(tokenRefreshRef.current);
        tokenRefreshRef.current = null;
      }
      const s = socketRef.current;
      socketRef.current = null;
      s?.removeAllListeners();
      s?.disconnect();
      setSocket(null);
      setSocketConnected(false);
    };
  }, [status, userId, applyUnreadHint]);

  if (status !== "authenticated" || !userId) {
    return (
      <ChatSocketContext.Provider value={inert}>
        {children}
      </ChatSocketContext.Provider>
    );
  }

  const value: ChatSocketContextValue = {
    socket,
    socketConnected,
    unreadByRequestId,
    unreadByConversationId,
    clearUnreadForConversation,
    setOpenConversationId,
    clearUnreadForRequest,
    joinConversationRoom,
  };

  return (
    <ChatSocketContext.Provider value={value}>
      {children}
    </ChatSocketContext.Provider>
  );
}
