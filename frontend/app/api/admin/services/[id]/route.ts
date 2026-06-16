import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/core/auth/server-authorization";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  const { id } = await params;

  try {
    const { session } = gate;
    const body = await request.json();
    const response = await fetchBackendAsUser(`/admin/services/${id}`, session.user.id, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({ error: "Failed to update service" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error updating service (admin):", error);
    return NextResponse.json(
      { error: "Failed to update service" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  const { id } = await params;

  try {
    const { session } = gate;
    const response = await fetchBackendAsUser(`/admin/services/${id}`, session.user.id, {
      method: "DELETE",
    });
    const payload = await response.json().catch(() => ({ error: "Failed to delete service" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error deleting service (admin):", error);
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 }
    );
  }
}

