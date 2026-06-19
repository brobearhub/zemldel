import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; docRequestId: string }> }) {
  const { id, docRequestId } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const response = await fetchBackendAsUser(`/requests/mine/${id}/document-requests/${docRequestId}/upload`, session.user.id, {
    method: "POST",
    body: formData,
  });
  const payload = await response.json().catch(() => ({ error: "Failed to upload document" }));
  return NextResponse.json(payload, { status: response.status });
}

