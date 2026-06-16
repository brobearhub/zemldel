import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/core/auth";
import { ProviderOnboardingForm } from "./ProviderOnboardingForm";

export default async function NewProviderPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  if (session.user.memberships.length > 0) {
    redirect("/profile");
  }

  return <ProviderOnboardingForm />;
}
