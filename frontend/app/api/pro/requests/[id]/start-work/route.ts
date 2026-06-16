import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const response = await fetchBackendAsUser(`/pro/requests/${id}/start-work`, session.user.id, { method: "POST" });
    const payload = await response.json().catch(() => ({ error: "Failed to start work" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error starting work:", error);
    return NextResponse.json({ error: "Failed to start work" }, { status: 500 });
  }
}
