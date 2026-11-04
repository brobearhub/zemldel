"use client";

import type { RequestCustomerDto } from "@/entities/request";
import { ChatThreeColumnLayout } from "@/widgets/chat/ui/ChatThreeColumnLayout";
import { CustomerRequestConversationWorkspace } from "@/widgets/customer-requests/ui/CustomerRequestConversationWorkspace";

type Props = {
  initialRequest: RequestCustomerDto;
  justCreated?: boolean;
  initialConversationId?: string;
};

export function CustomerRequestDetailClient({ initialRequest, justCreated = false, initialConversationId }: Props) {
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
