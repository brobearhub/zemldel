import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Stack, Typography } from "@mui/material";
import { getActiveMembership } from "@/core/auth/authorization";
import { getServerAuthSession } from "@/core/auth";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import { BackendApiError, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import {
  ProviderVerificationBlock,
  ProviderVerificationForm,
  type ProviderVerificationView,
} from "@/widgets/provider-verification";

export const metadata: Metadata = { title: "Проверка профиля — Земледел" };

export default async function ProviderVerificationPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    signInRedirect("/pro/profile/verification");
  }

  const activeMembership = getActiveMembership(session.user);
  if (!activeMembership) {
    notFound();
  }

  try {
    const verification = await fetchBackendJsonAsUser<ProviderVerificationView>(
      `/providers/${activeMembership.providerId}/verification`,
      session.user.id,
    );

    return (
      <Stack spacing={2}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Проверка профиля</Typography>
        {verification.available &&
        (verification.status === "NOT_VERIFIED" || verification.status === "REJECTED") ? (
          <>
            {verification.status === "REJECTED" ? (
              <Typography>
                Заявку отклонили{verification.rejectReason ? `: ${verification.rejectReason}` : ""}.
              </Typography>
            ) : null}
            <ProviderVerificationForm providerId={activeMembership.providerId} view={verification} />
          </>
        ) : (
          <ProviderVerificationBlock view={verification} />
        )}
      </Stack>
    );
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
      notFound();
    }
    throw error;
  }
}
