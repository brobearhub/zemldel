import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = (await request.json().catch(() => null)) as unknown;
    const response = await fetchBackendAsUser(`/pro/requests/${id}/price-proposals`, session.user.id, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const payload = await response.json().catch(() => ({ error: "Failed to propose price" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error proposing provider price:", error);
    return NextResponse.json({ error: "Failed to propose price" }, { status: 500 });
  }
}
