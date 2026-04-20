import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const response = await fetchBackendAsUser(`/pro/orders/${id}/request-acceptance`, session.user.id, { method: "POST" });
    const payload = await response.json().catch(() => ({ error: "Failed to request acceptance" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error requesting acceptance:", error);
    return NextResponse.json({ error: "Failed to request acceptance" }, { status: 500 });
  }
}

