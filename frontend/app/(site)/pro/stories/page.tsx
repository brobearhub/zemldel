import type { Metadata } from "next";
import { Stack, Typography } from "@mui/material";
import { getActiveMembership } from "@/core/auth/authorization";
import { getServerAuthSession } from "@/core/auth";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import { StoriesPage } from "@/views/stories-page";
import { ProfessionalWorkspacePanel } from "@/widgets/pro-dashboard/ui/ProfessionalWorkspacePanel";

export const metadata: Metadata = { title: "История — Земледел" };

export default async function ProStoriesPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    signInRedirect("/pro/stories");
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
    <Stack spacing={3}>
      <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
        История
      </Typography>
      <StoriesPage
        scope="provider"
        providerName={activeMembership.providerName}
        authorName={session.user.name}
      />
    </Stack>
  );
}
