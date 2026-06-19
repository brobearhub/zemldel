import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; docRequestId: string }> }
) {
  const { id, docRequestId } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const response = await fetchBackendAsUser(
    `/requests/mine/${id}/document-requests/${docRequestId}/file`,
    session.user.id,
    { method: "DELETE" }
  );
  const payload = await response.json().catch(() => ({ error: "Failed to delete document" }));
  return NextResponse.json(payload, { status: response.status });
}

