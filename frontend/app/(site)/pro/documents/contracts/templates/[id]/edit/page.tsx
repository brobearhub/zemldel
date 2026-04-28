import { notFound, redirect } from "next/navigation";
import { BackendApiError, fetchBackendJsonAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import type { ContractTemplateDetail } from "@/widgets/pro-contracts/ui/ProContractTemplateEditor";
import { ProContractTemplateEditor } from "@/widgets/pro-contracts/ui/ProContractTemplateEditor";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProContractTemplateEditPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/signin");
  if ((session.user.memberships?.length ?? 0) === 0) notFound();

  try {
    const template = await fetchBackendJsonAsUser<ContractTemplateDetail>(`/pro/contracts/templates/${id}`, session.user.id);
    return <ProContractTemplateEditor mode="edit" initial={template} />;
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
      notFound();
    }
    throw error;
  }
}

