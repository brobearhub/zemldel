import type { Metadata } from "next";
import type { ProviderClientDetail } from "@/entities/provider-client/model";
import { ProClientDetails } from "@/widgets/pro-clients/ui/ProClientDetails";
import { loadClientWorkspace } from "../server";

export const metadata: Metadata = { title: "Карточка клиента — Земледел" };

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const path = `/pro/clients/${encodeURIComponent(id)}`;
  const client = await loadClientWorkspace<ProviderClientDetail>(path, path);
  return <ProClientDetails key={id} client={client} />;
}
