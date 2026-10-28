import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ServiceDto } from "@/entities/service";
import { BackendApiError, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import { ProServicesListClient } from "@/widgets/pro-services/ui/ProServicesListClient";

export const metadata: Metadata = { title: "Услуги — Земледел" };

export default async function ProServicesListPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    signInRedirect("/pro/services/list");
  }

  if ((session.user.memberships?.length ?? 0) === 0) {
    notFound();
  }

  let services: ServiceDto[];

  try {
    services = await fetchBackendJsonAsUser<ServiceDto[]>("/pro/services", session.user.id);
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  return <ProServicesListClient initialServices={services} />;
}
