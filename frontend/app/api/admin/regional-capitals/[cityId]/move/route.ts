import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/core/auth/server-authorization";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ cityId: string }> }) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  const { cityId } = await params;

  try {
    const { session } = gate;
    const body = await request.json();
    const response = await fetchBackendAsUser(
      `/admin/regional-capitals/${encodeURIComponent(cityId)}/move`,
      session.user.id,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const payload = await response.json().catch(() => ({ error: "Failed to reorder regional capital" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error reordering regional capital (admin):", error);
    return NextResponse.json({ error: "Failed to reorder regional capital" }, { status: 500 });
  }
}
