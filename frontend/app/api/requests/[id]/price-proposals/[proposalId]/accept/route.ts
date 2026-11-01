import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; proposalId: string }> },
) {
  const { id, proposalId } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const response = await fetchBackendAsUser(
      `/requests/mine/${id}/price-proposals/${proposalId}/accept`,
      session.user.id,
      { method: "POST" },
    );
    const payload = await response.json().catch(() => ({ error: "Failed to accept price" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error accepting customer price:", error);
    return NextResponse.json({ error: "Failed to accept price" }, { status: 500 });
  }
}
