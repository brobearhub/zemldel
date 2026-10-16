import { notFound } from "next/navigation";
import { Stack } from "@mui/material";
import { getActiveMembership } from "@/core/auth/authorization";
import type { RequestReminderDto } from "@/entities/request";
import type { ServiceDto } from "@/entities/service";
import { BackendApiError, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import { ProfessionalWorkspacePanel } from "@/widgets/pro-dashboard/ui/ProfessionalWorkspacePanel";
import { ProHomePage } from "@/views/pro-home";
import { buildFirstSteps, type ProviderVerificationView } from "@/widgets/provider-verification";

export default async function ProDashboardPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    signInRedirect("/pro");
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
    // Why: заявки списка грузит клиент целиком. Здесь только услуги и напоминания.
    const [services, reminders, verification] = await Promise.all([
      fetchBackendJsonAsUser<ServiceDto[]>("/pro/services", session.user.id),
      fetchBackendJsonAsUser<RequestReminderDto[]>("/pro/reminders", session.user.id),
      fetchBackendJsonAsUser<ProviderVerificationView>(
        `/providers/${activeMembership.providerId}/verification`,
        session.user.id,
      ),
    ]);
    const serviceList = Array.isArray(services) ? services : [];

    return (
      <ProHomePage
        services={serviceList}
        reminders={Array.isArray(reminders) ? reminders : []}
        firstSteps={buildFirstSteps({
          providerType: activeMembership.providerType,
          hasPublishedService: serviceList.some((service) => service.status === "PUBLISHED"),
          verificationStatus: verification.status,
          rejectReason: verification.rejectReason,
        })}
      />
    );
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403)) {
      notFound();
    }

    throw error;
  }
}
