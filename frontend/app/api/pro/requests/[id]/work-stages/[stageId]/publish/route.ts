import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  const { id, stageId } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const response = await fetchBackendAsUser(`/pro/requests/${id}/work-stages/${stageId}/publish`, session.user.id, {
    method: "POST",
  });
  const payload = await response.json().catch(() => ({ error: "Failed to publish work stage" }));
  return NextResponse.json(payload, { status: response.status });
}
