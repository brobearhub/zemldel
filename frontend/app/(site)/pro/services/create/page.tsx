import { notFound } from "next/navigation";
import { getServerAuthSession } from "@/core/auth";
import { getActiveMembership } from "@/core/auth/authorization";
import { getServiceManagementContext } from "@/core/auth/server-authorization";
import { ProServiceEditor } from "@/widgets/pro-services/ui/ProServiceEditor";

export default async function ProServicesCreatePage() {
  const auth = await getServiceManagementContext("create");

  if ("error" in auth || !auth.context.providerId) {
    notFound();
  }

  const session = await getServerAuthSession();
  const providerCity = session?.user
    ? (getActiveMembership(session.user)?.providerCity ?? null)
    : null;

  return <ProServiceEditor mode="create" initialProviderCity={providerCity} />;
}
