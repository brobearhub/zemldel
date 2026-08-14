import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const response = await fetchBackendAsUser(`/requests/mine/${id}/payments`, session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to load payments" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error loading customer payments:", error);
    return NextResponse.json({ error: "Failed to load payments" }, { status: 500 });
  }
}
