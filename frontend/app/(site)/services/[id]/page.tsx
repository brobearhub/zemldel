import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ServiceDto } from "@/entities/service";
import { BackendApiError, fetchBackendJson } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
import { placeChipLabel } from "@/entities/service";
import { siteOrigin } from "@/shared/lib/site-origin";
import { publicPageMetadata, serializeJsonLd } from "@/shared/lib/seo";
import { ServicePageView } from "@/views/service-page";

type Props = {
  params: Promise<{ id: string }>;
};

function getService(id: string) {
  return fetchBackendJson<ServiceDto>(`/services/${encodeURIComponent(id)}`);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  let service: Pick<ServiceDto, "title" | "description" | "places" | "provider"> | null = null;

  try {
    service = await getService(id);
  } catch (e) {
    if (e instanceof BackendApiError && e.status === 404) {
      return { title: "Услуга" };
    }
    throw e;
  }

  if (!service) return { title: "Услуга" };
  const city = (service.places ?? []).slice(0, 2).map(placeChipLabel).join(", ") || null;
  const title = [service.title, city, service.provider?.name].filter(Boolean).join(" — ");
  const description = service.description?.trim().replace(/\s+/g, " ") ||
    `${service.title}${city ? `: ${city}` : ""}. Обсудите состав работ и стоимость с исполнителем на Земледеле.`;
  return publicPageMetadata(title, description, `/services/${id}`);
}

export default async function ServicePage({ params }: Props) {
  const { id } = await params;
  const session = await getServerAuthSession();
  let service: ServiceDto | null = null;

  try {
    service = await getService(id);
  } catch (e) {
    if (e instanceof BackendApiError && e.status === 404) {
      notFound();
    }
    // Why: 5xx/network must reach app/error.tsx (maintenance), not look like 404.
    throw e;
  }

  if (!service) notFound();

  const placeNames = (service.places ?? []).map(placeChipLabel);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    url: `${siteOrigin()}/services/${service.id}`,
    name: service.title,
    ...(service.description ? { description: service.description } : {}),
    ...(placeNames.length ? { areaServed: placeNames } : {}),
    ...(service.provider?.name
      ? { provider: { "@type": "LocalBusiness", name: service.provider.name } }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <ServicePageView service={service} session={session} />
    </>
  );
}

