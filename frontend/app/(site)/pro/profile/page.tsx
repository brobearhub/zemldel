import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Stack } from "@mui/material";
import { getActiveMembership } from "@/core/auth/authorization";
import { getServerAuthSession } from "@/core/auth";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import { BackendApiError, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import { ProfessionalWorkspacePanel } from "@/widgets/pro-dashboard/ui/ProfessionalWorkspacePanel";
import { ProviderProfileEditorSection, type PublicProviderProfile } from "@/widgets/provider-profile-editor";
import {
  ProviderVerificationBlock,
  type ProviderVerificationView,
} from "@/widgets/provider-verification";

export const metadata: Metadata = { title: "Профиль — Земледел" };

export default async function ProProfilePage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    signInRedirect("/pro/profile");
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
    const [profile, verification] = await Promise.all([
      fetchBackendJsonAsUser<PublicProviderProfile>(
        `/providers/${activeMembership.providerId}/public`,
        session.user.id,
      ),
      fetchBackendJsonAsUser<ProviderVerificationView>(
        `/providers/${activeMembership.providerId}/verification`,
        session.user.id,
      ),
    ]);

    return (
      <ProviderProfileEditorSection
        providerId={activeMembership.providerId}
        providerSlug={activeMembership.providerSlug}
        initialProfile={profile}
        canEditName={activeMembership.role === "OWNER"}
        imageSide="right"
        verified={verification.status === "VERIFIED"}
        headerAside={<ProviderVerificationBlock view={verification} layout="aside" />}
      />
    );
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
      notFound();
    }
    throw error;
  }
}

