import { ChatRequestPage } from "@/widgets/chats";

export default async function ProChatRequest({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  return <ChatRequestPage requestId={requestId} cabinetRole="provider" />;
}
