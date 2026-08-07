"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { io, type Socket } from "socket.io-client";
import type { ChatJoinConversationAck, ChatUnreadHintPayload } from "@/entities/chat/dto/chat.dto";
import { getChatSocketUrl } from "@/shared/config/chat-socket";
import { ChatSocketContext, type ChatSocketContextValue } from "./ChatSocketContext";

const TOKEN_REFRESH_MS = 240_000;

type Props = {
  readonly children: ReactNode;
};

function useInertValue(): ChatSocketContextValue {
  return {
    socket: null,
    socketConnected: false,
    unreadByRequestId: {},
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
  const [unreadByRequestId, setUnreadByRequestId] = useState<Record<string, number>>({});

  const openConversationIdRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const tokenRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setOpenConversationId = useCallback((conversationId: string | null) => {
    openConversationIdRef.current = conversationId;
  }, []);

  const clearUnreadForRequest = useCallback((requestId: string) => {
    setUnreadByRequestId((prev) => ({ ...prev, [requestId]: 0 }));
  }, []);

  const applyUnreadHint = useCallback((hint: ChatUnreadHintPayload) => {
    if (hint.conversationId === openConversationIdRef.current) {
      return;
    }
    const id = hint.serviceRequestId ?? hint.subjectId;
    if (!id) return;
    setUnreadByRequestId((prev) => ({
      ...prev,
      [id]: (prev[id] ?? 0) + 1,
    }));
  }, []);

  const joinConversationRoom = useCallback(async (conversationId: string) => {
    const s = socketRef.current;
    if (!s?.connected) {
      return { ok: false, error: "Disconnected" } satisfies ChatJoinConversationAck;
    }
    return await new Promise<ChatJoinConversationAck>((resolve) => {
      s.emit("joinConversation", { conversationId }, (ack: ChatJoinConversationAck | undefined) => {
        resolve(ack ?? { ok: false, error: "No ack" });
      });
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

    async function connectWithFreshToken() {
      const tokenResponse = await fetch("/api/chat/socket-token", { cache: "no-store" });
      const tokenPayload = (await tokenResponse.json().catch(() => null)) as { token?: string } | null;
      if (!tokenResponse.ok || !tokenPayload?.token) {
        return null;
      }

      const url = getChatSocketUrl();
      if (!url) {
        return null;
      }

      const s = io(url, {
        auth: { token: tokenPayload.token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10_000,
      });

      s.on("connect", () => {
        setSocketConnected(true);
      });
      s.on("disconnect", () => {
        setSocketConnected(false);
      });
      s.on("chat.unreadHint", (hint: ChatUnreadHintPayload) => {
        applyUnreadHint(hint);
      });

      return s;
    }

    async function start() {
      const s = await connectWithFreshToken();
      if (cancelled || !s) {
        s?.disconnect();
        return;
      }
      socketRef.current = s;
      setSocket(s);
      setSocketConnected(s.connected);
    }

    void start();

    tokenRefreshRef.current = setInterval(() => {
      const current = socketRef.current;
      if (!current) {
        return;
      }
      void (async () => {
        const tokenResponse = await fetch("/api/chat/socket-token", { cache: "no-store" });
        const tokenPayload = (await tokenResponse.json().catch(() => null)) as { token?: string } | null;
        if (!tokenResponse.ok || !tokenPayload?.token) {
          return;
        }
        current.auth = { token: tokenPayload.token };
        current.disconnect();
        current.connect();
      })();
    }, TOKEN_REFRESH_MS);

    return () => {
      cancelled = true;
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
    return <ChatSocketContext.Provider value={inert}>{children}</ChatSocketContext.Provider>;
  }

  const value: ChatSocketContextValue = {
    socket,
    socketConnected,
    unreadByRequestId,
    setOpenConversationId,
    clearUnreadForRequest,
    joinConversationRoom,
  };

  return <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>;
}
