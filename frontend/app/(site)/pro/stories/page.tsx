import { redirect } from "next/navigation";
import { Stack } from "@mui/material";
import { getActiveMembership } from "@/core/auth/authorization";
import { getServerAuthSession } from "@/core/auth";
import { StoriesPage } from "@/views/stories-page";
import { ProfessionalWorkspacePanel } from "@/widgets/pro-dashboard/ui/ProfessionalWorkspacePanel";

export default async function ProStoriesPage() {
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

  return (
    <StoriesPage
      scope="provider"
      providerName={activeMembership.providerName}
      authorName={session.user.name}
    />
  );
}
