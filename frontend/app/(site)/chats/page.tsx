import type { Metadata } from "next";
import { ChatsInboxPage } from "@/widgets/chats";

export const metadata: Metadata = {
  title: "Чаты — Земледел",
};

export default function ChatsPage() {
  return <ChatsInboxPage />;
}

