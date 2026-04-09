import { notFound, redirect } from "next/navigation";
import { Box, Stack, Typography } from "@mui/material";
import type { ServiceRequestProDto } from "@/entities/service-request";
import { BackendApiError, fetchBackendJsonAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import { ChatBodyWithSidePanelLayout } from "@/widgets/chat/ui/ChatBodyWithSidePanelLayout";
import { ServiceRequestChatPanel } from "@/widgets/chat/ui/ServiceRequestChatPanel";
import { ProRequestDetails } from "@/widgets/pro-requests/ui/ProRequestDetails";

type Props = {
  params: Promise<{ id: string }>;
};

function pickSubtitle(item: ServiceRequestProDto) {
  if (item.kind === "SERVICE") return item.serviceTitle ?? "Заявка по услуге";
  if (item.kind === "TEMPLATE") return item.templateTitle ?? "Заявка по шаблону";
  return item.location ? `Локация: ${item.location}` : "Свободная заявка";
}

export default async function ProRequestDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  if ((session.user.memberships?.length ?? 0) === 0) {
    notFound();
  }

  let req: ServiceRequestProDto;
  try {
    req = await fetchBackendJsonAsUser<ServiceRequestProDto>(`/pro/service-requests/${id}`, session.user.id);
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
      notFound();
    }
    throw error;
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Заявка
        </Typography>
        <Typography color="text.secondary">{pickSubtitle(req)}</Typography>
      </Box>

      <ChatBodyWithSidePanelLayout
        middle={<ProRequestDetails initialRequest={req} />}
        right={
          req.isLocked ? (
            <Box>
              <Typography color="text.secondary">Заявка уже взята в работу. Чат недоступен.</Typography>
            </Box>
          ) : req.status === "CLOSED" ? (
            <Box>
              <Typography color="text.secondary">Заявка закрыта клиентом. Чат недоступен.</Typography>
            </Box>
          ) : (
            <ServiceRequestChatPanel serviceRequestId={req.id} title="Чат" subtitle={pickSubtitle(req)} />
          )
        }
      />
    </Stack>
  );
}

