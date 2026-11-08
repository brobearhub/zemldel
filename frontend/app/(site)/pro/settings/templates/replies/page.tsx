import { getServerAuthSession } from "@/core/auth";
import { getActiveMembership } from "@/core/auth/authorization";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import { WorkspaceTools } from "@/widgets/billing/WorkspaceTools";

export const metadata = { title: "Ответы клиенту — Земледел" };

export default async function SettingsSectionPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) signInRedirect("/pro/settings/templates/replies");
  const member = getActiveMembership(session.user);
  if (!member) return <p>Выберите профиль исполнителя.</p>;
  return (
    <WorkspaceTools
      key={member.providerId}
      providerId={member.providerId}
      initialTab="templates"
      sectionTitle="Ответы клиенту"
    />
  );
}
