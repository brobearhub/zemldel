import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  const { id, stageId } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payloadIn = await request.json().catch(() => null);
  const response = await fetchBackendAsUser(`/pro/requests/${id}/work-stages/${stageId}`, session.user.id, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payloadIn ?? {}),
  });
  const payload = await response.json().catch(() => ({ error: "Failed to update work stage" }));
  return NextResponse.json(payload, { status: response.status });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  const { id, stageId } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const response = await fetchBackendAsUser(`/pro/requests/${id}/work-stages/${stageId}`, session.user.id, {
    method: "DELETE",
  });
  const payload = await response.json().catch(() => ({ error: "Failed to delete work stage" }));
  return NextResponse.json(payload, { status: response.status });
}
