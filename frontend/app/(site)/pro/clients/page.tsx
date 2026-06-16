import { notFound, redirect } from "next/navigation";
import { Box, Stack, Typography } from "@mui/material";
import type { RequestCustomerDto } from "@/entities/request";
import { BackendApiError, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
import { ProClientsBoard } from "@/widgets/pro-clients/ui/ProClientsBoard";

function sortByCreatedAtDesc(orders: RequestCustomerDto[]) {
  return [...orders].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export default async function ProClientsPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  if ((session.user.memberships?.length ?? 0) === 0) {
    notFound();
  }

  let orders: RequestCustomerDto[];

  try {
    orders = await fetchBackendJsonAsUser<RequestCustomerDto[]>("/pro/requests", session.user.id);
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403)) {
      notFound();
    }

    throw error;
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Клиенты
        </Typography>
        <Typography color="text.secondary">
          Уникальные заказчики активного provider, собранные из всех заказов независимо от их статуса.
        </Typography>
      </Box>

      <ProClientsBoard initialOrders={sortByCreatedAtDesc(orders)} />
    </Stack>
  );
}
