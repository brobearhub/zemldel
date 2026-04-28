import { fetchBackendJsonAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import { AdminContractBlocksClient } from "./AdminContractBlocksClient";

export default async function AdminContractBlocksPage() {
  const session = await getServerAuthSession();
  const blocks = session?.user?.id
    ? await fetchBackendJsonAsUser<Parameters<typeof AdminContractBlocksClient>[0]["initialBlocks"]>(
        "/admin/contracts/blocks",
        session.user.id,
      )
    : [];

  return <AdminContractBlocksClient initialBlocks={blocks} />;
}
