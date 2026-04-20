import { notFound, redirect } from "next/navigation";
import { Box, Paper, Stack, Typography } from "@mui/material";
import type { OrderDto } from "@/entities/order";
import { StatusProgressStepper, buildOrderStatusFlowSteps, getOrderFlowActiveStepId, getOrderStatusLabel } from "@/entities/order";
import { BackendApiError, fetchBackendJsonAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import { ChatBodyWithSidePanelLayout } from "@/widgets/chat/ui/ChatBodyWithSidePanelLayout";
import { ServiceRequestChatPanel } from "@/widgets/chat/ui/ServiceRequestChatPanel";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  if ((session.user.memberships?.length ?? 0) === 0) {
    notFound();
  }

  let order: OrderDto;
  try {
    order = await fetchBackendJsonAsUser<OrderDto>(`/pro/orders/${id}`, session.user.id);
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
          Заказ
        </Typography>
        <Typography color="text.secondary">{order.serviceTitle}</Typography>
      </Box>

      <ChatBodyWithSidePanelLayout
        middle={
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={1}>
              <Typography fontWeight={800}>Детали заказа</Typography>
              <StatusProgressStepper
                steps={buildOrderStatusFlowSteps(order.status)}
                activeStepId={getOrderFlowActiveStepId(order.status)}
              />
              <Typography color="text.secondary">Provider: {order.providerName}</Typography>
              <Typography color="text.secondary">
                Клиент: {order.customerName ?? "Без имени"}
                {order.customerEmail ? ` · ${order.customerEmail}` : ""}
              </Typography>
              <Typography color="text.secondary">Статус: {getOrderStatusLabel(order.status)}</Typography>
            </Stack>
          </Paper>
        }
        right={
          <ServiceRequestChatPanel serviceRequestId={order.id} title="Чат" subtitle={order.serviceTitle} />
        }
      />
    </Stack>
  );
}

