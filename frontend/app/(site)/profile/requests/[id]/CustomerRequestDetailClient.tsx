"use client";

import type { RequestCustomerDto } from "@/entities/request";
import { ChatThreeColumnLayout } from "@/widgets/chat/ui/ChatThreeColumnLayout";
import { CustomerRequestConversationWorkspace } from "@/widgets/customer-requests/ui/CustomerRequestConversationWorkspace";

type Props = {
  initialRequest: RequestCustomerDto;
  justCreated?: boolean;
};

export function CustomerRequestDetailClient({ initialRequest, justCreated = false }: Props) {
  return (
    <ChatThreeColumnLayout
      left={<></>}
      leftWidth={0}
      middle={<CustomerRequestConversationWorkspace initialRequest={initialRequest} justCreated={justCreated} />}
      right={<></>}
      rightWidth={0}
    />
  );
}
