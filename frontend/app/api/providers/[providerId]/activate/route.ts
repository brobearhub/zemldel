import { NextRequest, NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { providerId } = await params;
    const response = await fetchBackendAsUser(
      `/providers/${providerId}/activate`,
      session.user.id,
      { method: "POST" }
    );
    const payload = await response.json().catch(() => ({ error: "Failed to activate provider" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error activating provider:", error);
    return NextResponse.json({ error: "Failed to activate provider" }, { status: 500 });
  }
}
