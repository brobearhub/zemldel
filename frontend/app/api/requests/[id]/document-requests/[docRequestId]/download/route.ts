import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; docRequestId: string }> }
) {
  const { id, docRequestId } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = `/requests/mine/${id}/document-requests/${docRequestId}/download${qs ? `?${qs}` : ""}`;
  const backendRes = await fetchBackendAsUser(path, session.user.id);

  const headers = new Headers(backendRes.headers);
  headers.delete("content-encoding");
  headers.delete("transfer-encoding");
  return new NextResponse(backendRes.body, { status: backendRes.status, headers });
}

