import type { MetadataRoute } from "next";
import { siteOrigin } from "@/shared/lib/site-origin";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
