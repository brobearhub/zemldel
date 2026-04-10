import { notFound, redirect } from "next/navigation";
import { Stack } from "@mui/material";
import { getActiveMembership } from "@/core/auth/authorization";
import type { OrderDto } from "@/entities/order";
import type { ServiceDto } from "@/entities/service";
import type { ServiceRequestProDto } from "@/entities/service-request";
import { BackendApiError, fetchBackendJsonAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import { ProOverviewDashboard } from "@/widgets/pro-dashboard/ui/ProOverviewDashboard";
import { ProfessionalWorkspacePanel } from "@/widgets/pro-dashboard/ui/ProfessionalWorkspacePanel";

const sortByRecent = <T extends { updatedAt: string; createdAt?: string }>(items: T[]) =>
  [...items].sort((left, right) => {
    const leftValue = new Date(left.updatedAt ?? left.createdAt).getTime();
    const rightValue = new Date(right.updatedAt ?? right.createdAt).getTime();
    return rightValue - leftValue;
  });

export default async function ProOverviewPage() {
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
    const [services, orders, feed] = await Promise.all([
      fetchBackendJsonAsUser<ServiceDto[]>("/pro/services", session.user.id),
      fetchBackendJsonAsUser<OrderDto[]>("/pro/orders", session.user.id),
      fetchBackendJsonAsUser<ServiceRequestProDto[]>("/pro/service-requests/feed", session.user.id),
    ]);

    return (
      <Stack spacing={3}>
        <ProOverviewDashboard
          provider={activeMembership}
          services={services}
          requests={sortByRecent(feed)}
          orders={sortByRecent(orders)}
        />
      </Stack>
    );
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403)) {
      notFound();
    }

    throw error;
  }
}

