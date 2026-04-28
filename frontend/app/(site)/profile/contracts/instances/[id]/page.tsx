import { notFound, redirect } from "next/navigation";
import { BackendApiError, fetchBackendJsonAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import type { CustomerContractInstanceDetail } from "@/widgets/customer-contracts/ui/CustomerContractInstanceView";
import { CustomerContractInstanceView } from "@/widgets/customer-contracts/ui/CustomerContractInstanceView";
import { ChatThreeColumnLayout } from "@/widgets/chat/ui/ChatThreeColumnLayout";
import { ProfileSidebarNav } from "@/widgets/profile/ui/ProfileSidebarNav";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CustomerContractInstancePage({ params }: Props) {
  const { id } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/signin");

  try {
    const instance = await fetchBackendJsonAsUser<CustomerContractInstanceDetail>(`/contracts/instances/${id}`, session.user.id);
    return (
      <main>
        <ChatThreeColumnLayout
          left={<ProfileSidebarNav selected="requests" />}
          middle={<CustomerContractInstanceView initial={instance} />}
          right={<></>}
          rightWidth={0}
        />
      </main>
    );
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
      notFound();
    }
    throw error;
  }
}

