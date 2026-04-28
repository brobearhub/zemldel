import { NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/core/auth/server-authorization";
import { fetchBackendAsUser } from "@/lib/backend-api";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  try {
    const body = await request.text();
    const response = await fetchBackendAsUser(`/admin/contracts/blocks/${id}/status`, gate.session.user.id, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body,
    });
    const payload = await response.json().catch(() => ({ error: "Failed to update contract block status" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error updating admin contract block status:", error);
    return NextResponse.json({ error: "Failed to update contract block status" }, { status: 500 });
  }
}
