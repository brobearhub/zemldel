import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

export async function POST(_: Request, { params }: { params: Promise<{ requestId: string; id: string }> }) {
  const { requestId, id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const response = await fetchBackendAsUser(
      `/pro/contracts/requests/${requestId}/instances/${id}/attach`,
      session.user.id,
      { method: "POST" }
    );
    const payload = await response.json().catch(() => ({ error: "Failed to attach contract" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error attaching contract to request:", error);
    return NextResponse.json({ error: "Failed to attach contract" }, { status: 500 });
  }
}
