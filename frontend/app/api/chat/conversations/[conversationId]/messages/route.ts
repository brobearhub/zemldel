import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

type RouteParams = { params: Promise<{ conversationId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await params;
    const url = new URL(request.url);
    const search = url.searchParams.toString();
    const path = `/chat/conversations/${conversationId}/messages${search ? `?${search}` : ""}`;

    const response = await fetchBackendAsUser(path, session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch messages" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await params;
    const body = await request.json().catch(() => null);
    const response = await fetchBackendAsUser(
      `/chat/conversations/${conversationId}/messages`,
      session.user.id,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      },
    );
    const payload = await response.json().catch(() => ({ error: "Failed to send message" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error sending chat message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
