import type { Metadata } from "next";
import { fetchBackendJson } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
import { HomeStickyRequestLayout } from "@/app/(site)/HomeStickyRequestLayout";

type ServiceCategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number | null;
};

export default async function IndexPage() {
  const session = await getServerAuthSession();
  const categories = await fetchBackendJson<ServiceCategoryRow[]>("/service-categories");

  return (
    <HomeStickyRequestLayout
      isAuthenticated={Boolean(session?.user?.id)}
      categories={categories}
    />
  );
}

export const metadata: Metadata = {
  title: "Земледел",
  description: "Земледел",
  openGraph: {
    title: "Земледел",
    description: "Земледел",
    url: "https://novagor.ru",
    siteName: "Земледел",
    images: [{ url: "https://novagor.ru/og-image.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Земледел",
    description: "Земледел",
    images: [{ url: "https://novagor.ru/og-image.png" }],
  },
};

