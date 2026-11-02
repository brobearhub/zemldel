"use client";

import { useState } from "react";
import { Typography } from "@mui/material";
import type { RequestProDto } from "@/entities/request";
import { ChatBodyWithSidePanelLayout } from "@/widgets/chat/ui/ChatBodyWithSidePanelLayout";
import { ServiceRequestChatPanel } from "@/widgets/chat/ui/ServiceRequestChatPanel";
import { ProRequestDetails } from "./ProRequestDetails";

export function ProRequestWorkspace({
  initialRequest,
  subtitle,
}: {
  initialRequest: RequestProDto;
  subtitle: string;
}) {
  const [request, setRequest] = useState(initialRequest);
  return (
    <ChatBodyWithSidePanelLayout
      middle={
        <ProRequestDetails
          initialRequest={initialRequest}
          subtitle={subtitle}
          onRequestChange={setRequest}
        />
      }
      right={
        request.status === "CLOSED" ? (
          <Typography color="text.secondary">
            Заявка закрыта клиентом. Чат недоступен.
          </Typography>
        ) : (
          <ServiceRequestChatPanel
            serviceRequestId={request.id}
            title="Чат"
            subtitle={subtitle}
            requestLockedAt={request.lockedAt}
            selectedProviderId={request.providerId}
            requestArchived={request.isLocked}
          />
        )
      }
    />
  );
}
