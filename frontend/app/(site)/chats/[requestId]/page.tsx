import { ChatRequestPage } from "@/widgets/chats";

type RouteParams = { params: Promise<{ requestId: string }> };

export default async function ChatRequest({ params }: RouteParams) {
  const { requestId } = await params;
  return <ChatRequestPage requestId={requestId} />;
}

