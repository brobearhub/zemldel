"use client";

import type { RequestCustomerDto } from "@/entities/request";
import { ChatThreeColumnLayout } from "@/widgets/chat/ui/ChatThreeColumnLayout";
import { CustomerRequestConversationWorkspace } from "@/widgets/customer-requests/ui/CustomerRequestConversationWorkspace";
import { CabinetSidebarSlot } from "@/shared/ui/CabinetSidebarSlot";
import { ProfileSidebarNav } from "@/widgets/profile/ui/ProfileSidebarNav";
import { PROFILE_SIDEBAR_STORAGE_KEY } from "@/widgets/profile/ui/ProfileSidebarSlot";

type Props = {
  initialRequest: RequestCustomerDto;
};

export function CustomerRequestDetailClient({ initialRequest }: Props) {
  return (
    <CabinetSidebarSlot storageKey={PROFILE_SIDEBAR_STORAGE_KEY} framed={false}>
      {({ collapsed, onToggleCollapsed, width }) => (
        <ChatThreeColumnLayout
          leftWidth={width}
          left={
            <ProfileSidebarNav
              selected="requests"
              collapsed={collapsed}
              onToggleCollapsed={onToggleCollapsed}
            />
          }
          middle={<CustomerRequestConversationWorkspace initialRequest={initialRequest} />}
          right={<></>}
          rightWidth={0}
        />
      )}
    </CabinetSidebarSlot>
  );
}
