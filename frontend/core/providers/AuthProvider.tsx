"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { SessionRecovery } from "@/core/auth/SessionRecovery";
import { SessionSync } from "@/core/auth/SessionSync";
import { ChatSocketProvider } from "@/widgets/chat/socket/ChatSocketProvider";

interface Props {
  readonly children: ReactNode;
}

export function AuthProvider({ children }: Props) {
  return (
    <SessionProvider>
      <SessionRecovery />
      <SessionSync />
      <ChatSocketProvider>{children}</ChatSocketProvider>
    </SessionProvider>
  );
}

