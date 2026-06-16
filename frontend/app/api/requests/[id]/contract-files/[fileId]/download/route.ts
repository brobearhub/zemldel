import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const { id, fileId } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = `/requests/mine/${id}/contract-files/${fileId}/download${qs ? `?${qs}` : ""}`;
  const backendRes = await fetchBackendAsUser(path, session.user.id);

  const headers = new Headers(backendRes.headers);
  headers.delete("content-encoding");
  headers.delete("transfer-encoding");
  return new NextResponse(backendRes.body, { status: backendRes.status, headers });
}

