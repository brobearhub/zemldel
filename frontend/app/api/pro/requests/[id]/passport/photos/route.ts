import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  try {
    const { id } = await params;
    const response = await fetchBackendAsUser(`/pro/requests/${encodeURIComponent(id)}/passport/photos`, session.user.id, { cache: "no-store" });
    return NextResponse.json(await response.json(), { status: response.status, headers });
  } catch { return NextResponse.json({ error: "Фотографии недоступны" }, { status: 502, headers }); }
}
