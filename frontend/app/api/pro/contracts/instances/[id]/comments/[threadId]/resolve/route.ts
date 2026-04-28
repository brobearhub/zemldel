import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; threadId: string }> },
) {
  const { id, threadId } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const response = await fetchBackendAsUser(`/pro/contracts/instances/${id}/comments/${threadId}/resolve`, session.user.id, {
      method: "POST",
    });
    const payload = await response.json().catch(() => ({ error: "Failed to resolve comment" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error resolving contract comment:", error);
    return NextResponse.json({ error: "Failed to resolve comment" }, { status: 500 });
  }
}
