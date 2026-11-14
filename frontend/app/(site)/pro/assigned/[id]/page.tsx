import { AssignedRequests } from "@/widgets/provider-team/AssignedRequests";
import { getServerAuthSession } from "@/core/auth";
import { signInRedirect } from "@/core/auth/sign-in-redirect";

export default async function AssignedRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) signInRedirect(`/pro/assigned/${id}`);
  return <AssignedRequests requestId={id} />;
}
