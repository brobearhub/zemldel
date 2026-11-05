import type { MetadataRoute } from "next";
import type { ServiceDto } from "@/entities/service";
import { fetchBackendJson } from "@/shared/api/backend/server";
import { siteOrigin } from "@/shared/lib/site-origin";

const PUBLIC_PAGES = ["/", "/about", "/terms", "/privacy", "/consent", "/offer"] as const;

// Read the current published catalog on every request; never cache a partial build-time snapshot.
export const dynamic = "force-dynamic";

type SitemapCategory = {
  id: string;
  parentId: string | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  // A failed dependency must return an error, not a successful but incomplete sitemap.
  const [services, categories] = await Promise.all([
    fetchBackendJson<ServiceDto[]>("/services"),
    fetchBackendJson<SitemapCategory[]>("/service-categories"),
  ]);

  const providers = new Map<string, string>();
  for (const service of services) {
    const slug = service.provider?.slug;
    if (slug) providers.set(slug, `${origin}/providers/${encodeURIComponent(slug)}`);
  }

  return [
    ...PUBLIC_PAGES.map((path) => ({ url: path === "/" ? origin : `${origin}${path}` })),
    ...categories
      .filter((category) => category.id.trim() !== "")
      .map((category) => ({ url: `${origin}/service-categories/${encodeURIComponent(category.id.trim())}` })),
    ...[...providers.values()].map((url) => ({ url })),
    ...services.map((service) => ({ url: `${origin}/services/${service.id}` })),
  ];
}
