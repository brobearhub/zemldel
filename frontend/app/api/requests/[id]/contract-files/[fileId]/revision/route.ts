import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const { id, fileId } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.text();
  const response = await fetchBackendAsUser(`/requests/mine/${id}/contract-files/${fileId}/revision`, session.user.id, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  const payload = await response.json().catch(() => ({ error: "Failed to request revision" }));
  return NextResponse.json(payload, { status: response.status });
}

