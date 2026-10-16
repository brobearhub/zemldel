import type { MetadataRoute } from "next";
import type { ServiceDto } from "@/entities/service";
import { fetchBackendJson } from "@/shared/api/backend/server";
import { siteOrigin } from "@/shared/lib/site-origin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  let services: ServiceDto[] = [];
  try {
    services = await fetchBackendJson<ServiceDto[]>("/services");
  } catch {
    services = [];
  }

  const providers = new Map<string, string>();
  for (const service of services) {
    const slug = service.provider?.slug;
    if (slug) providers.set(slug, `${origin}/providers/${slug}`);
  }

  return [
    ...[...providers.values()].map((url) => ({ url })),
    ...services.map((service) => ({ url: `${origin}/services/${service.id}` })),
  ];
}
