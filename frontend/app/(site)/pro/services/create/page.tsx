import { notFound } from "next/navigation";
import { getServerAuthSession } from "@/core/auth";
import { getActiveMembership } from "@/core/auth/authorization";
import { getServiceManagementContext } from "@/core/auth/server-authorization";
import type { ServiceCategory } from "@/entities/service";
import { fetchBackendJson } from "@/shared/api/backend/server";
import { ProServiceEditor } from "@/widgets/pro-services/ui/ProServiceEditor";
import { serviceDraftStorageKey } from "@/widgets/pro-services/lib/new-service-draft";

export default async function ProServicesCreatePage() {
  const auth = await getServiceManagementContext("create");

  if ("error" in auth || !auth.context.providerId) {
    notFound();
  }

  const session = await getServerAuthSession();
  const providerCity = session?.user
    ? (getActiveMembership(session.user)?.providerCity ?? null)
    : null;
  const categories = await fetchBackendJson<ServiceCategory[]>("/service-categories");

  return (
    <ProServiceEditor
      mode="create"
      draftStorageKey={serviceDraftStorageKey(auth.context.actorUserId, auth.context.providerId)}
      initialProviderCity={providerCity}
      categories={categories}
    />
  );
}
