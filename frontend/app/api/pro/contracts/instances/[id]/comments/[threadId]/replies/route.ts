import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; threadId: string }> },
) {
  const { id, threadId } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.text();
    const response = await fetchBackendAsUser(`/pro/contracts/instances/${id}/comments/${threadId}/replies`, session.user.id, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const payload = await response.json().catch(() => ({ error: "Failed to reply to comment" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error replying to contract comment:", error);
    return NextResponse.json({ error: "Failed to reply to comment" }, { status: 500 });
  }
}
