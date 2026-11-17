"use client";

import type { RequestCustomerDto } from "@/entities/request";
import { useEffect } from "react";
import { ChatThreeColumnLayout } from "@/widgets/chat/ui/ChatThreeColumnLayout";
import { CustomerRequestConversationWorkspace } from "@/widgets/customer-requests/ui/CustomerRequestConversationWorkspace";

type Props = {
  initialRequest: RequestCustomerDto;
  justCreated?: boolean;
  initialConversationId?: string;
};

export function CustomerRequestDetailClient({ initialRequest, justCreated = false, initialConversationId }: Props) {
  useEffect(() => {
    if (!justCreated) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("created") !== "1") return;
    url.searchParams.delete("created");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [justCreated]);

  return (
    <ChatThreeColumnLayout
      left={<></>}
      leftWidth={0}
      middle={(
        <CustomerRequestConversationWorkspace
          initialRequest={initialRequest}
          justCreated={justCreated}
          initialConversationId={initialConversationId}
        />
      )}
      right={<></>}
      rightWidth={0}
    />
  );
}
