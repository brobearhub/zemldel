import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

type RouteParams = { params: Promise<{ conversationId: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await params;
    const response = await fetchBackendAsUser(
      `/chat/conversations/${conversationId}/read`,
      session.user.id,
      { method: "POST" },
    );
    const payload = await response.json().catch(() => ({ error: "Failed to mark read" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error marking chat read:", error);
    return NextResponse.json({ error: "Failed to mark read" }, { status: 500 });
  }
}
