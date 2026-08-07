import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; stageId: string; slotId: string }> }) {
  const { id, stageId, slotId } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const response = await fetchBackendAsUser(`/pro/requests/${id}/work-stages/${stageId}/doc-slots/${slotId}`, session.user.id, {
    method: "DELETE",
  });
  const payload = await response.json().catch(() => ({ error: "Failed to delete doc slot" }));
  return NextResponse.json(payload, { status: response.status });
}
