import { notFound, redirect } from "next/navigation";
import { Box, Typography } from "@mui/material";
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
  if (item.subjectType === "SERVICE") return item.serviceTitle ?? "Заявка по услуге";
  if (item.subjectType === "CATEGORY") return item.categoryName ? `Категория: ${item.categoryName}` : "Заявка по категории";
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
    <ChatBodyWithSidePanelLayout
      middle={<ProRequestDetails initialRequest={req} subtitle={pickSubtitle(req)} />}
      right={
        req.status === "CLOSED" ? (
          <Box>
            <Typography color="text.secondary">Заявка закрыта клиентом. Чат недоступен.</Typography>
          </Box>
        ) : (
          <ServiceRequestChatPanel serviceRequestId={req.id} title="Чат" subtitle={pickSubtitle(req)} />
        )
      }
    />
  );
}

