import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

type RouteParams = { params: Promise<{ conversationId: string }> };

export async function GET(_: Request, { params }: RouteParams) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await params;
    const response = await fetchBackendAsUser(`/chat/conversations/${conversationId}/access`, session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch conversation access" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching conversation access:", error);
    return NextResponse.json({ error: "Failed to fetch conversation access" }, { status: 500 });
  }
}

