import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Stack, Typography } from "@mui/material";
import Link from "@/shared/ui/Link";
import { getActiveMembership } from "@/core/auth/authorization";
import { getServerAuthSession } from "@/core/auth";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import { BackendApiError, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import {
  finishSentence,
  ProviderVerificationBlock,
  ProviderVerificationForm,
  VerifiedRequisitesChange,
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
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          Проверка профиля
        </Typography>
        {verification.available && verification.status === "VERIFIED" ? (
          <Stack spacing={1.5}>
            <ProviderVerificationBlock view={verification} />
            <VerifiedRequisitesChange providerId={activeMembership.providerId} view={verification} />
          </Stack>
        ) : verification.available &&
        (verification.status === "NOT_VERIFIED" || verification.status === "REJECTED") ? (
          <>
            {verification.status === "REJECTED" ? (
              <Typography>
                {finishSentence(
                  verification.rejectReason?.trim()
                    ? `Заявку отклонили: ${verification.rejectReason.trim()}`
                    : "Заявку отклонили",
                )}
              </Typography>
            ) : null}
            <ProviderVerificationForm providerId={activeMembership.providerId} view={verification} />
          </>
        ) : (
          <Stack spacing={1.5}>
            <ProviderVerificationBlock view={verification} />
            {verification.status === "PENDING" ? (
              <Stack spacing={0.5}>
                <Typography sx={{ fontWeight: 700 }}>Что дальше</Typography>
                <Typography>
                  Заявка в очереди администратора. Решение — до 1 рабочего дня, статус появится в этом профиле.
                </Typography>
                <Link href="/pro/profile">К профилю</Link>
              </Stack>
            ) : null}
          </Stack>
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
