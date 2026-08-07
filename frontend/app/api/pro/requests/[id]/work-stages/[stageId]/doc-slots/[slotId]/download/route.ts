import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; stageId: string; slotId: string }> }) {
  const { id, stageId, slotId } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const response = await fetchBackendAsUser(
    `/pro/requests/${id}/work-stages/${stageId}/doc-slots/${slotId}/download${qs ? `?${qs}` : ""}`,
    session.user.id
  );
  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/octet-stream",
      "content-disposition": response.headers.get("content-disposition") ?? "attachment",
      "cache-control": "private, no-store",
    },
  });
}
