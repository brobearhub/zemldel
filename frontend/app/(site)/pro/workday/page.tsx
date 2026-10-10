import { BackendApiError, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import type { RequestReminderDto } from "@/entities/request";
import { WorkdayView } from "@/widgets/pro-requests/ui/WorkdayView";

export default async function ProWorkdayPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    signInRedirect("/pro/workday");
  }

  try {
    const reminders = await fetchBackendJsonAsUser<RequestReminderDto[]>(
      "/pro/reminders/workday",
      session.user.id,
    );

    return <WorkdayView initialReminders={reminders} />;
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403)) {
      signInRedirect("/pro/workday");
    }
    throw error;
  }
}
