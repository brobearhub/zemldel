import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.text();
    const response = await fetchBackendAsUser(`/requests/mine/${id}/send-remarks`, session.user.id, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const payload = await response.json().catch(() => ({ error: "Failed to send remarks" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error sending remarks:", error);
    return NextResponse.json({ error: "Failed to send remarks" }, { status: 500 });
  }
}
