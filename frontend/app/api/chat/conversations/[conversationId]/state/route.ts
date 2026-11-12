import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  const { conversationId } = await params;
  const response = await fetchBackendAsUser(
    `/chat/conversations/${encodeURIComponent(conversationId)}/state`,
    session.user.id,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await request.json().catch(() => ({}))),
    },
  );
  return NextResponse.json(await response.json(), { status: response.status });
}
