import { notFound } from "next/navigation";
import { Stack } from "@mui/material";
import { getActiveMembership } from "@/core/auth/authorization";
import { type RequestProDto } from "@/entities/request";
import { BackendApiError, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import { ProfessionalWorkspacePanel } from "@/widgets/pro-dashboard/ui/ProfessionalWorkspacePanel";
import { ProRequestsFeed } from "@/widgets/pro-requests/ui/ProRequestsFeed";

export default async function ProRequestsPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    signInRedirect("/pro/requests");
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
      fetchBackendJsonAsUser<RequestProDto[]>(
        "/pro/requests/inbox?status=NEW",
        session.user.id
      ),
      fetchBackendJsonAsUser<RequestProDto[]>("/pro/requests", session.user.id),
    ]);

    return (
      <Stack spacing={3}>
        <ProRequestsFeed initialItems={feed} initialOrders={orders ?? []} />
      </Stack>
    );
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403)) {
      notFound();
    }

    throw error;
  }
}
