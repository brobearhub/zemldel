import { NextResponse } from "next/server";
import { proxyProviderJson } from "@/shared/api/backend/server/proxy-provider-json";

type Context = { params: Promise<{ path?: string[] }> };

async function proxy(request: Request, { params }: Context) {
  const { path = [] } = await params;
  const [id, action] = path;
  if (
    (id && !/^[a-f0-9-]{36}$/i.test(id)) ||
    path.length > 2 ||
    (action && !["invitation", "requests"].includes(action))
  ) {
    return NextResponse.json({ error: "Страница не найдена" }, { status: 404 });
  }
  return proxyProviderJson(request, ["/pro/clients", ...path].join("/"));
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
