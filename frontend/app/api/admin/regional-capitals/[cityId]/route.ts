import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/core/auth/server-authorization";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ cityId: string }> }) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  const { cityId } = await params;

  try {
    const { session } = gate;
    const body = await request.json();
    const response = await fetchBackendAsUser(
      `/admin/regional-capitals/${encodeURIComponent(cityId)}`,
      session.user.id,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const payload = await response.json().catch(() => ({ error: "Failed to update regional capital" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error updating regional capital (admin):", error);
    return NextResponse.json({ error: "Failed to update regional capital" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ cityId: string }> }) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  const { cityId } = await params;

  try {
    const { session } = gate;
    const response = await fetchBackendAsUser(
      `/admin/regional-capitals/${encodeURIComponent(cityId)}`,
      session.user.id,
      { method: "DELETE" },
    );
    const payload = await response.json().catch(() => ({ error: "Failed to remove regional capital" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error removing regional capital (admin):", error);
    return NextResponse.json({ error: "Failed to remove regional capital" }, { status: 500 });
  }
}
