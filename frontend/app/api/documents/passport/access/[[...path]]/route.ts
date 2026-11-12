import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ path?: string[] }> };
async function proxy(request: Request, { params }: Context) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  const path = (await params).path ?? [];
  const validPath = request.method === "GET"
    ? path.length === 0 || (path.length === 1 && path[0] === "requests")
    : request.method === "PUT"
      ? path.length === 1
      : path.length === 2 || (path.length === 3 && path[0] === "requests");
  if (!validPath) return NextResponse.json({ error: "Not found" }, { status: 404, headers });
  try {
    const response = await fetchBackendAsUser(`/documents/passport/access${path.length ? `/${path.map(encodeURIComponent).join("/")}` : ""}`, session.user.id, {
      method: request.method,
      cache: "no-store",
      ...(request.method === "PUT" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(await request.json()) } : {}),
    });
    return NextResponse.json(await response.json(), { status: response.status, headers });
  } catch {
    return NextResponse.json({ error: "Не удалось обновить доступ к паспорту" }, { status: 502, headers });
  }
}
export const GET = proxy;
export const PUT = proxy;
export const DELETE = proxy;
