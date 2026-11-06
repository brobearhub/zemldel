import { getServerAuthSession } from "@/core/auth";
import { getActiveMembership } from "@/core/auth/authorization";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import { WorkspaceTools } from "@/widgets/billing/WorkspaceTools";
export const metadata = { title: "Инструменты профиля — Земледел" };
export default async function ToolsPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) signInRedirect("/pro/tools");
  const member = getActiveMembership(session.user);
  if (!member) return <p>Выберите профиль исполнителя.</p>;
  return (
    <WorkspaceTools
      key={member.providerId}
      providerId={member.providerId}
    />
  );
}
