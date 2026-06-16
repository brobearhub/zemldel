import { redirect } from "next/navigation";
import { BackendApiError, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
import type { RequestReminderDto } from "@/entities/request";
import { WorkdayView } from "@/widgets/pro-requests/ui/WorkdayView";

export default async function ProWorkdayPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  try {
    const reminders = await fetchBackendJsonAsUser<RequestReminderDto[]>(
      "/pro/reminders/workday",
      session.user.id,
    );

    return <WorkdayView initialReminders={reminders} />;
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403)) {
      redirect("/signin");
    }
    throw error;
  }
}
