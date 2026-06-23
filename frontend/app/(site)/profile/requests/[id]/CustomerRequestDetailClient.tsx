"use client";

import { useEffect, useState } from "react";
import type { RequestCustomerDto } from "@/entities/request";
import { ChatThreeColumnLayout } from "@/widgets/chat/ui/ChatThreeColumnLayout";
import { CustomerRequestConversationWorkspace } from "@/widgets/customer-requests/ui/CustomerRequestConversationWorkspace";
import { ProfileSidebarNav } from "@/widgets/profile/ui/ProfileSidebarNav";

const STORAGE_KEY = "ui.sidebar.profile.collapsed";
const EXPANDED_W = 320;
const COLLAPSED_W = 72;

function readCollapsedFromStorage(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

function writeCollapsedToStorage(value: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore storage errors
  }
}

type Props = {
  initialRequest: RequestCustomerDto;
};

export function CustomerRequestDetailClient({ initialRequest }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsedFromStorage());
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsedToStorage(next);
      return next;
    });
  };

  return (
    <ChatThreeColumnLayout
      leftWidth={collapsed ? COLLAPSED_W : EXPANDED_W}
      left={<ProfileSidebarNav selected="requests" collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />}
      middle={<CustomerRequestConversationWorkspace initialRequest={initialRequest} />}
      right={<></>}
      rightWidth={0}
    />
  );
}

