import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; stageId: string; slotId: string }> }) {
  const { id, stageId, slotId } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const response = await fetchBackendAsUser(
    `/requests/mine/${id}/work-stages/${stageId}/doc-slots/${slotId}/upload`,
    session.user.id,
    { method: "POST", body: form }
  );
  const payload = await response.json().catch(() => ({ error: "Failed to upload document" }));
  return NextResponse.json(payload, { status: response.status });
}
