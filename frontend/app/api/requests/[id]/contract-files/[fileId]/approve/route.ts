import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const { id, fileId } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const response = await fetchBackendAsUser(
    `/requests/mine/${id}/contract-files/${fileId}/approve`,
    session.user.id,
    { method: "POST" }
  );
  const payload = await response.json().catch(() => ({ error: "Failed to approve contract file" }));
  return NextResponse.json(payload, { status: response.status });
}

