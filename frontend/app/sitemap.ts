import type { MetadataRoute } from "next";
import type { ServiceDto } from "@/entities/service";
import { fetchBackendJson } from "@/shared/api/backend/server";
import { siteOrigin } from "@/shared/lib/site-origin";

const PUBLIC_PAGES = ["/", "/about", "/terms", "/privacy", "/consent", "/offer"] as const;

type SitemapCategory = {
  id: string;
  parentId: string | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  let services: ServiceDto[] = [];
  let categories: SitemapCategory[] = [];
  try {
    services = await fetchBackendJson<ServiceDto[]>("/services");
  } catch {
    services = [];
  }
  try {
    categories = await fetchBackendJson<SitemapCategory[]>("/service-categories");
  } catch {
    categories = [];
  }

  const providers = new Map<string, string>();
  for (const service of services) {
    const slug = service.provider?.slug;
    if (slug) providers.set(slug, `${origin}/providers/${slug}`);
  }

  return [
    ...PUBLIC_PAGES.map((path) => ({ url: path === "/" ? origin : `${origin}${path}` })),
    ...categories
      .filter((category) => category.parentId == null && category.id.trim() !== "")
      .map((category) => ({ url: `${origin}/service-categories/${encodeURIComponent(category.id.trim())}` })),
    ...[...providers.values()].map((url) => ({ url })),
    ...services.map((service) => ({ url: `${origin}/services/${service.id}` })),
  ];
}
