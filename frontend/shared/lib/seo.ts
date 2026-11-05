import type { Metadata } from "next";
import { siteOrigin } from "./site-origin";

export const SITE_DESCRIPTION =
  "Земельные и кадастровые услуги: межевание, оформление документов, подключение коммуникаций и помощь со сделками. Найдите исполнителя или опишите свою задачу.";

export function publicPageMetadata(title: string, description: string, path: string): Metadata {
  const url = `${siteOrigin()}${path === "/" ? "" : path}`;
  const images = [{ url: `${siteOrigin()}/hero-bg-house_static_day.jpg` }];
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Земледел",
      locale: "ru_RU",
      type: "website",
      images,
    },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
