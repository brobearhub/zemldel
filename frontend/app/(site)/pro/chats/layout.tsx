import type { ReactNode } from "react";
import { ChatsWorkspace } from "@/widgets/chats/ui/ChatsWorkspace";

export default function ChatsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ChatsWorkspace role="provider" />
    </>
  );
}
