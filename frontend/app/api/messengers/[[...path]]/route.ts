import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

type Context = { params: Promise<{ path?: string[] }> };

async function proxy(request: Request, context: Context) {
  const path = (await context.params).path ?? [];
  const resource = path.join("/");
  const allowed = request.method === "GET" ? resource === ""
    : request.method === "POST" ? /^(TELEGRAM|MAX)\/(link|confirm)$/.test(resource)
      : request.method === "PATCH" ? /^(TELEGRAM|MAX)\/notifications$/.test(resource)
        : request.method === "DELETE" && /^(TELEGRAM|MAX)$/.test(resource);
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const origin = request.headers.get("origin");
  if (request.method !== "GET" && origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const response = await fetchBackendAsUser(`/messengers${resource ? `/${resource}` : ""}`, session.user.id, {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
        "x-request-id": request.headers.get("x-request-id") ?? crypto.randomUUID(),
      },
      body: ["POST", "PATCH"].includes(request.method) ? (await request.text()) || "{}" : undefined,
    });
    if (response.status === 204) return new NextResponse(null, { status: 204 });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ message: "Мессенджеры временно недоступны. Попробуйте ещё раз." }, { status: 503 });
  }
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
