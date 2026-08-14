import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const { id, paymentId } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const response = await fetchBackendAsUser(`/requests/mine/${id}/payments/${paymentId}/paid`, session.user.id, { method: "POST" });
    const payload = await response.json().catch(() => ({ error: "Failed to mark paid" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error marking customer payment as paid:", error);
    return NextResponse.json({ error: "Failed to mark paid" }, { status: 500 });
  }
}

