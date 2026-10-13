import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/core/auth";
import { resolveAccountKind } from "@/core/auth/authorization";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import { ProviderOnboardingForm } from "./ProviderOnboardingForm";

export const metadata: Metadata = { title: "Создание профиля — Земледел" };

export default async function NewProviderPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    signInRedirect("/providers/new");
  }

  const isPlatformAdmin = session.user.systemRole === "PLATFORM_ADMIN";
  if (!isPlatformAdmin && resolveAccountKind(session.user) !== "PROVIDER") {
    redirect("/profile?notice=providers-only");
  }

  if (session.user.memberships.length > 0) {
    redirect("/pro?notice=profile-ready");
  }

  return <ProviderOnboardingForm />;
}
