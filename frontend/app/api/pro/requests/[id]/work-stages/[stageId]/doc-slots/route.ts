import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  const { id, stageId } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payloadIn = await request.json().catch(() => null);
  const response = await fetchBackendAsUser(`/pro/requests/${id}/work-stages/${stageId}/doc-slots`, session.user.id, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payloadIn ?? {}),
  });
  const payload = await response.json().catch(() => ({ error: "Failed to create doc slot" }));
  return NextResponse.json(payload, { status: response.status });
}
