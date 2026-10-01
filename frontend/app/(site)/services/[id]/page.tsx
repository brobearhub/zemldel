import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ServiceDto } from "@/entities/service";
import { BackendApiError, fetchBackendJson } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
import { ServicePageView } from "@/views/service-page";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  let service: Pick<ServiceDto, "title" | "description"> | null = null;

  try {
    service = await fetchBackendJson<ServiceDto>(`/services/${id}`);
  } catch (e) {
    if (e instanceof BackendApiError && e.status === 404) {
      return { title: "Услуга" };
    }
    console.error("Error fetching service metadata:", e);
  }

  if (!service) return { title: "Услуга" };
  return {
    title: `${service.title} — Земледел`,
    description: service.description ?? undefined,
  };
}

export default async function ServicePage({ params }: Props) {
  const { id } = await params;
  const session = await getServerAuthSession();
  let service: ServiceDto | null = null;

  try {
    service = await fetchBackendJson<ServiceDto>(`/services/${id}`);
  } catch (e) {
    if (e instanceof BackendApiError && e.status === 404) {
      notFound();
    }
    // Why: 5xx/network must reach app/error.tsx (maintenance), not look like 404.
    throw e;
  }

  if (!service) notFound();

  return (
    <ServicePageView service={service} session={session} />
  );
}

