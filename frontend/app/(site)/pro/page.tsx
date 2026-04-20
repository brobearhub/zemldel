import { notFound, redirect } from "next/navigation";
import { Stack } from "@mui/material";
import { getActiveMembership } from "@/core/auth/authorization";
import { isOpenOrderStatus, type OrderDto } from "@/entities/order";
import type { ServiceRequestProDto } from "@/entities/service-request";
import { BackendApiError, fetchBackendJsonAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import { ProfessionalWorkspacePanel } from "@/widgets/pro-dashboard/ui/ProfessionalWorkspacePanel";
import { ProRequestsFeed } from "@/widgets/pro-requests/ui/ProRequestsFeed";

export default async function ProDashboardPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const activeMembership = getActiveMembership(session.user);

  if (!activeMembership) {
    return (
      <Stack spacing={3}>
        <ProfessionalWorkspacePanel />
      </Stack>
    );
  }

  try {
    const [feed, orders] = await Promise.all([
      fetchBackendJsonAsUser<ServiceRequestProDto[]>(
        "/pro/service-requests/inbox?status=NEW&categoryId=null",
        session.user.id
      ),
      fetchBackendJsonAsUser<OrderDto[]>("/pro/orders", session.user.id),
    ]);
    const activeOrders = (orders ?? []).filter((o) => isOpenOrderStatus(o.status));

    return (
      <Stack spacing={3}>
        <ProRequestsFeed initialItems={feed} initialActiveOrders={activeOrders} />
      </Stack>
    );
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403)) {
      notFound();
    }

    throw error;
  }
}
