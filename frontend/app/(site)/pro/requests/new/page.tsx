import type { Metadata } from "next";
import type { ProviderClient } from "@/entities/provider-client/model";
import type { ServiceDto } from "@/entities/service";
import { PrivateRequestForm } from "@/widgets/pro-clients/ui/PrivateRequestForm";
import { loadClientWorkspace } from "../../clients/server";

export const metadata: Metadata = {
  title: "Новая заявка для клиента — Земледел",
};

export default async function NewClientRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const returnTo = clientId
    ? `/pro/requests/new?clientId=${encodeURIComponent(clientId)}`
    : "/pro/requests/new";
  const [clients, services] = await Promise.all([
    loadClientWorkspace<ProviderClient[]>("/pro/clients", returnTo),
    loadClientWorkspace<ServiceDto[]>("/pro/services", returnTo),
  ]);
  return (
    <PrivateRequestForm
      clients={clients}
      initialClientId={clientId}
      services={services
        .filter((s) => s.status === "PUBLISHED")
        .map(({ id, title }) => ({ id, title }))}
    />
  );
}
