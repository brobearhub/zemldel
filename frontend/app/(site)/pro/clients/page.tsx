import type { Metadata } from "next";
import type { ProviderClient } from "@/entities/provider-client/model";
import { loadClientWorkspace } from "./server";
import { ProClientsBoard } from "@/widgets/pro-clients/ui/ProClientsBoard";

export const metadata: Metadata = { title: "Клиенты — Земледел" };

export default async function ProClientsPage() {
  const clients = await loadClientWorkspace<ProviderClient[]>(
    "/pro/clients",
    "/pro/clients",
  );
  return <ProClientsBoard clients={clients} />;
}
