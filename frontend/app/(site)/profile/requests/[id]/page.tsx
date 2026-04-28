import { notFound, redirect } from "next/navigation";
import type { RequestCustomerDto } from "@/entities/request";
import { BackendApiError, fetchBackendJsonAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import { ChatThreeColumnLayout } from "@/widgets/chat/ui/ChatThreeColumnLayout";
import { CustomerRequestConversationWorkspace } from "@/widgets/customer-requests/ui/CustomerRequestConversationWorkspace";
import { ProfileSidebarNav } from "@/widgets/profile/ui/ProfileSidebarNav";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CustomerRequestDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  let req: RequestCustomerDto;
  try {
    req = await fetchBackendJsonAsUser<RequestCustomerDto>(`/requests/mine/${id}`, session.user.id);
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
      notFound();
    }
    throw error;
  }

  return (
    <main>
      <ChatThreeColumnLayout
        left={<ProfileSidebarNav selected="requests" />}
        middle={<CustomerRequestConversationWorkspace initialRequest={req} />}
        right={<></>}
        rightWidth={0}
      />
    </main>
  );
}

