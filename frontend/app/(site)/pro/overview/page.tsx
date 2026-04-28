import { notFound, redirect } from "next/navigation";
import { Stack } from "@mui/material";
import { getActiveMembership } from "@/core/auth/authorization";
import type { RequestCustomerDto, RequestProDto, RequestReminderDto } from "@/entities/request";
import type { ServiceDto } from "@/entities/service";
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
    const [services, orders, feed, todayReminders] = await Promise.all([
      fetchBackendJsonAsUser<ServiceDto[]>("/pro/services", session.user.id),
      fetchBackendJsonAsUser<RequestCustomerDto[]>("/pro/requests", session.user.id),
      fetchBackendJsonAsUser<RequestProDto[]>("/pro/requests/feed", session.user.id),
      fetchBackendJsonAsUser<RequestReminderDto[]>("/pro/reminders/today", session.user.id),
    ]);

    return (
      <Stack spacing={3}>
        <ProOverviewDashboard
          provider={activeMembership}
          services={services}
          requests={sortByRecent(feed)}
          orders={sortByRecent(orders)}
          todayReminders={todayReminders}
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
