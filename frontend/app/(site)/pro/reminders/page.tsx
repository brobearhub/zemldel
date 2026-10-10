import { BackendApiError, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import type { RequestReminderDto } from "@/entities/request";
import { RemindersListView } from "@/widgets/pro-requests/ui/RemindersListView";

export default async function ProRemindersPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    signInRedirect("/pro/reminders");
  }

  try {
    const reminders = await fetchBackendJsonAsUser<RequestReminderDto[]>(
      "/pro/reminders",
      session.user.id,
    );

    return <RemindersListView initialReminders={reminders} />;
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403)) {
      signInRedirect("/pro/reminders");
    }
    throw error;
  }
}
