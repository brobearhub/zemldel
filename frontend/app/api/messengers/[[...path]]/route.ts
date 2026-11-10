import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { isAllowedMessengerRoute } from "./is-allowed-messenger-route";

type Context = { params: Promise<{ path?: string[] }> };

function hasAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    // Behind a reverse proxy request.url can contain an internal HTTP origin.
    // Trust the configured public URL, never client-supplied forwarded headers.
    const expectedOrigin = new URL(process.env.NEXTAUTH_URL ?? request.url)
      .origin;
    return origin === expectedOrigin;
  } catch {
    return false;
  }
}

async function proxy(request: Request, context: Context) {
  const path = (await context.params).path ?? [];
  const resource = path.join("/");
  if (!isAllowedMessengerRoute(request.method, resource))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.method !== "GET" && !hasAllowedOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const response = await fetchBackendAsUser(
      `/messengers${resource ? `/${resource}` : ""}`,
      session.user.id,
      {
        method: request.method,
        headers: {
          "Content-Type": "application/json",
          "x-request-id":
            request.headers.get("x-request-id") ?? crypto.randomUUID(),
        },
        body: ["POST", "PATCH"].includes(request.method)
          ? (await request.text()) || "{}"
          : undefined,
      },
    );
    if (response.status === 204) return new NextResponse(null, { status: 204 });
    return NextResponse.json(await response.json(), {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { message: "Не удалось получить ответ сервера. Обновите статус подключения." },
      { status: 503 },
    );
  }
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
