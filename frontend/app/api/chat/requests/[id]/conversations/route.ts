import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const response = await fetchBackendAsUser(`/chat/requests/${id}/conversations`, session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch conversations" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching request conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}
