import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/core/auth";
import { resolveAccountKind } from "@/core/auth/authorization";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import { ProviderOnboardingForm } from "./ProviderOnboardingForm";

export const metadata: Metadata = {
  robots: { index: false, follow: true }, title: "Создание профиля — Земледел" };

export default async function NewProviderPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const params = await searchParams;
  const returnTo = /^\/partner-invitations\/[A-Za-z0-9_-]{43}$/.test(params.returnTo ?? "") ? params.returnTo : undefined;
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    signInRedirect(returnTo ?? "/providers/new");
  }

  const isPlatformAdmin = session.user.systemRole === "PLATFORM_ADMIN";
  if (!isPlatformAdmin && resolveAccountKind(session.user) !== "PROVIDER") {
    redirect("/profile?notice=providers-only");
  }

  if (session.user.memberships.length > 0) {
    redirect(returnTo ?? "/pro/requests/feed?notice=profile-ready");
  }

  return <ProviderOnboardingForm returnTo={returnTo} />;
}
