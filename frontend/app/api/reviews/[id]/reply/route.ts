import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const body = await request.text();
    const response = await fetchBackendAsUser(`/reviews/${id}/reply`, session.user.id, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const payload = await response.json().catch(() => ({ error: "Failed to reply" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error replying to review:", error);
    return NextResponse.json({ error: "Failed to reply" }, { status: 500 });
  }
}
