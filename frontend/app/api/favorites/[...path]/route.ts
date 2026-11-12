import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

type Context = { params: Promise<{ path: string[] }> };
async function proxy(request: Request, { params }: Context) {
  const session = await getServerAuthSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  const { path } = await params;
  if (
    !(
      (path.length === 1 &&
        ["services", "providers", "states"].includes(path[0])) ||
      (path.length === 2 &&
        ["services", "providers"].includes(path[0]) &&
        /^[\da-f-]{36}$/i.test(path[1]))
    )
  )
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  const response = await fetchBackendAsUser(
    `/favorites/${path.join("/")}${new URL(request.url).search}`,
    session.user.id,
    {
      method: request.method,
      ...(request.method === "POST"
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(await request.json().catch(() => ({}))),
          }
        : {}),
    },
  );
  return NextResponse.json(await response.json(), {
    status: response.status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
