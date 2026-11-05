import type { ServiceDto } from "@/entities/service";
import { publicPageMetadata, SITE_DESCRIPTION } from "@/shared/lib/seo";
import { redirect } from "next/navigation";
import { fetchBackendJson } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
import { getActiveMembership, resolveAccountKind } from "@/core/auth/authorization";
import { HomeStickyRequestLayout } from "@/app/(site)/HomeStickyRequestLayout";

type ServiceCategoryRow = {
  id: string;
  name: string;
  shortName?: string | null;
  slug: string;
  parentId: string | null;
  sortOrder: number | null;
};

export default async function IndexPage() {
  const session = await getServerAuthSession();

  if (
    session?.user &&
    session.user.systemRole !== "PLATFORM_ADMIN" &&
    resolveAccountKind(session.user) === "PROVIDER" &&
    !getActiveMembership(session.user)
  ) {
    redirect("/providers/new");
  }

  const [categories, services] = await Promise.all([
    fetchBackendJson<ServiceCategoryRow[]>("/service-categories"),
    fetchBackendJson<ServiceDto[]>("/services"),
  ]);

  return (
    <HomeStickyRequestLayout
      isAuthenticated={Boolean(session?.user?.id)}
      categories={categories}
      initialServices={services}
    />
  );
}

export const metadata = publicPageMetadata(
  "Земельные и кадастровые услуги — Земледел",
  SITE_DESCRIPTION,
  "/",
);

