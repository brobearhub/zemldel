import type { Metadata } from "next";
import type { ServiceDto } from "@/entities/service";
import { fetchBackendJson } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import { HomeStickyRequestLayout } from "@/app/(site)/HomeStickyRequestLayout";

type ServiceCategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number | null;
  placements: Array<"HOME">;
};

export default async function IndexPage() {
  const session = await getServerAuthSession();
  const services = await fetchBackendJson<ServiceDto[]>("/services");
  const categories = await fetchBackendJson<ServiceCategoryRow[]>("/service-categories?placement=HOME");

  return (
    <HomeStickyRequestLayout
      isAuthenticated={Boolean(session?.user?.id)}
      categories={categories}
      initialServices={services}
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

