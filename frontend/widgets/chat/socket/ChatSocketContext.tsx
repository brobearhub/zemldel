"use client";

import type { Socket } from "socket.io-client";
import { createContext, useContext } from "react";
export type ChatSocketContextValue = {
  socket: Socket | null;
  socketConnected: boolean;
  unreadByRequestId: Record<string, number>;
  setOpenConversationId: (conversationId: string | null) => void;
  clearUnreadForRequest: (requestId: string) => void;
  joinConversationRoom: (conversationId: string) => Promise<import("@/entities/chat/dto/chat.dto").ChatJoinConversationAck>;
};

export const ChatSocketContext = createContext<ChatSocketContextValue | null>(null);

export function useChatSocket(): ChatSocketContextValue {
  const ctx = useContext(ChatSocketContext);
  if (!ctx) {
    throw new Error("useChatSocket must be used within ChatSocketProvider");
  }
  return ctx;
}
