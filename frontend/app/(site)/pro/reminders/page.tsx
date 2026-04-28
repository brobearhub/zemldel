import { redirect } from "next/navigation";
import { BackendApiError, fetchBackendJsonAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import type { RequestReminderDto } from "@/entities/request";
import { RemindersListView } from "@/widgets/pro-requests/ui/RemindersListView";

export default async function ProRemindersPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  try {
    const reminders = await fetchBackendJsonAsUser<RequestReminderDto[]>(
      "/pro/reminders",
      session.user.id,
    );

    return <RemindersListView initialReminders={reminders} />;
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403)) {
      redirect("/signin");
    }
    throw error;
  }
}
