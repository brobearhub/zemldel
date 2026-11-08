import { getServerAuthSession } from "@/core/auth";
import { getActiveMembership } from "@/core/auth/authorization";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import { TeamTasksWorkspace } from "@/widgets/pro-team-tasks/TeamTasksWorkspace";

export const metadata = { title: "Задачи команды — Земледел" };

export default async function TeamTasksPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) signInRedirect("/pro/team/tasks");
  const member = getActiveMembership(session.user);
  if (!member) return <p>Выберите профиль исполнителя.</p>;
  return (
    <TeamTasksWorkspace
      key={member.providerId}
      providerId={member.providerId}
    />
  );
}
