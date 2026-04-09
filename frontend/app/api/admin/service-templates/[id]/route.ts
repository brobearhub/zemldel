import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/core/auth/server-authorization";
import { fetchBackendAsUser } from "@/lib/backend-api";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  const { id } = await params;

  try {
    const { session } = gate;
    const body = await request.json();
    const response = await fetchBackendAsUser(`/admin/service-templates/${id}`, session.user.id, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({ error: "Failed to patch template" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error patching service template (admin):", error);
    return NextResponse.json({ error: "Failed to patch template" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  const { id } = await params;

  try {
    const { session } = gate;
    const response = await fetchBackendAsUser(`/admin/service-templates/${id}`, session.user.id, {
      method: "DELETE",
    });
    const payload = await response.json().catch(() => ({ error: "Failed to delete template" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error deleting service template (admin):", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}

