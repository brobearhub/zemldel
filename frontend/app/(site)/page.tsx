import type { Metadata } from "next";
import type { ServiceDto } from "@/entities/service";
import { fetchBackendJson } from "@/lib/backend-api";
import type { ServiceTemplateRow } from "@/widgets/service-templates/ui/ServiceTemplatesSection";
import { getServerAuthSession } from "@/lib/auth";
import { HomeStickyRequestLayout } from "@/app/(site)/HomeStickyRequestLayout";

export default async function IndexPage() {
  const session = await getServerAuthSession();
  const services = await fetchBackendJson<ServiceDto[]>("/services");
  const templates = await fetchBackendJson<ServiceTemplateRow[]>("/service-templates");
  
  return <HomeStickyRequestLayout isAuthenticated={Boolean(session?.user?.id)} templates={templates} initialServices={services} />;
}

export const metadata: Metadata = {
  title: "Новые горизонты",
  description: "Новые горизонты",
  openGraph: {
    title: "Новые горизонты",
    description: "Новые горизонты",
    url: "https://novagor.ru",
    siteName: "Новые горизонты",
    images: [{ url: "https://novagor.ru/og-image.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Новые горизонты",
    description: "Новые горизонты",
    images: [{ url: "https://novagor.ru/og-image.png" }],
  },
};

