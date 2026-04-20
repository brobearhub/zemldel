import { notFound, redirect } from "next/navigation";
import { Box, Paper, Stack, Typography } from "@mui/material";
import type { OrderDto } from "@/entities/order";
import { StatusProgressStepper, buildOrderStatusFlowSteps, getOrderFlowActiveStepId, getOrderStatusLabel } from "@/entities/order";
import { BackendApiError, fetchBackendJsonAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import { ChatThreeColumnLayout } from "@/widgets/chat/ui/ChatThreeColumnLayout";
import { ServiceRequestChatPanel } from "@/widgets/chat/ui/ServiceRequestChatPanel";
import { ProfileSidebarNav } from "@/widgets/profile/ui/ProfileSidebarNav";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CustomerOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  let order: OrderDto;
  try {
    order = await fetchBackendJsonAsUser<OrderDto>(`/orders/mine/${id}`, session.user.id);
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
      notFound();
    }
    throw error;
  }

  return (
    <main>
      <ChatThreeColumnLayout
        left={<ProfileSidebarNav selected="orders" />}
        middle={
          <Stack spacing={2}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Заказ
              </Typography>
              <Typography color="text.secondary">{order.serviceTitle}</Typography>
            </Box>
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Stack spacing={1}>
                <Typography fontWeight={800}>Детали</Typography>
                <StatusProgressStepper
                  steps={buildOrderStatusFlowSteps(order.status)}
                  activeStepId={getOrderFlowActiveStepId(order.status)}
                />
                <Typography color="text.secondary">Исполнитель: {order.providerName}</Typography>
                <Typography color="text.secondary">Статус: {getOrderStatusLabel(order.status)}</Typography>
              </Stack>
            </Paper>
          </Stack>
        }
        right={
          <ServiceRequestChatPanel serviceRequestId={order.id} title="Чат" subtitle={order.serviceTitle} />
        }
      />
    </main>
  );
}

