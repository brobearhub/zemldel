"use client";

import type { RequestCustomerDto } from "@/entities/request";
import { ChatThreeColumnLayout } from "@/widgets/chat/ui/ChatThreeColumnLayout";
import { CustomerRequestConversationWorkspace } from "@/widgets/customer-requests/ui/CustomerRequestConversationWorkspace";

type Props = {
  initialRequest: RequestCustomerDto;
};

export function CustomerRequestDetailClient({ initialRequest }: Props) {
  return (
    <ChatThreeColumnLayout
      left={<></>}
      leftWidth={0}
      middle={<CustomerRequestConversationWorkspace initialRequest={initialRequest} />}
      right={<></>}
      rightWidth={0}
    />
  );
}
