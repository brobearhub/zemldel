import type { ReactNode } from "react";
import { ProviderChatsWorkspace } from "@/widgets/chats/ui/ProviderChatsWorkspace";

export default function ChatsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ProviderChatsWorkspace />
    </>
  );
}
