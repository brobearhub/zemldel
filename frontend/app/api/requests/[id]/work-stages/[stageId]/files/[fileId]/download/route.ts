import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; stageId: string; fileId: string }> }) {
  const { id, stageId, fileId } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const response = await fetchBackendAsUser(
    `/requests/mine/${id}/work-stages/${stageId}/files/${fileId}/download${qs ? `?${qs}` : ""}`,
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
