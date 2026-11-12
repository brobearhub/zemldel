import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ id: string; path?: string[] }> };

async function proxy(request: Request, { params }: Context) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  const { id, path = [] } = await params;
  if (request.method === "GET" ? path.length !== 0 : path.length !== 1 || !["FORM", "PHOTO"].includes(path[0])) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers });
  }
  try {
    const response = await fetchBackendAsUser(
      `/pro/requests/${encodeURIComponent(id)}/passport/access-requests${path.length ? `/${path[0]}` : ""}`,
      session.user.id,
      { method: request.method, cache: "no-store" },
    );
    return NextResponse.json(await response.json(), { status: response.status, headers });
  } catch {
    return NextResponse.json({ error: "Не удалось запросить доступ к паспорту" }, { status: 502, headers });
  }
}

export const GET = proxy;
export const POST = proxy;
