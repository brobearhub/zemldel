"use client";

import { Container, Paper } from "@mui/material";
import { sitePageContainerSx } from "@/shared/config/site-layout";
import { ServiceRequestChatPanel } from "@/widgets/chat/ui/ServiceRequestChatPanel";

type Props = {
  requestId: string;
};

export function ChatRequestPage({ requestId }: Props) {
  return (
    <main>
      <Container maxWidth="xxl" sx={sitePageContainerSx}>
        <Paper sx={{ width: "100%", p: { xs: 2, sm: 3 } }}>
          <ServiceRequestChatPanel serviceRequestId={requestId} title="Чат" />
        </Paper>
      </Container>
    </main>
  );
}

