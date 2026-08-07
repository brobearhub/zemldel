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

    const body = await request.json().catch(() => null);
    const response = await fetchBackendAsUser(`/pro/requests/${id}/decline-offer`, session.user.id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const payload = await response.json().catch(() => ({ error: "Failed to decline offer" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error declining offer:", error);
    return NextResponse.json({ error: "Failed to decline offer" }, { status: 500 });
  }
}
