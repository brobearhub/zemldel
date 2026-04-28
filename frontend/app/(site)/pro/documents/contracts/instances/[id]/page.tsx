import { notFound, redirect } from "next/navigation";
import { BackendApiError, fetchBackendJsonAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import type { ProContractInstanceDetail } from "@/widgets/pro-contracts/ui/ProContractInstanceView";
import { ProContractInstanceView } from "@/widgets/pro-contracts/ui/ProContractInstanceView";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProContractInstancePage({ params }: Props) {
  const { id } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/signin");
  if ((session.user.memberships?.length ?? 0) === 0) notFound();

  try {
    const instance = await fetchBackendJsonAsUser<ProContractInstanceDetail>(`/pro/contracts/instances/${id}`, session.user.id);
    return <ProContractInstanceView initial={instance} rightWidth={320} />;
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
      notFound();
    }
    throw error;
  }
}

