import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "./backend-fetch";

export async function proxyProviderJson(request: Request, path: string) {
  const session = await getServerAuthSession();
  const headers = { "cache-control": "private, no-store" };
  if (!session?.user?.id)
    return NextResponse.json(
      { error: "Войдите в аккаунт" },
      { status: 401, headers },
    );
  try {
    const body = ["POST", "PATCH"].includes(request.method)
      ? await request.text()
      : undefined;
    const response = await fetchBackendAsUser(path, session.user.id, {
      method: request.method,
      cache: "no-store",
      ...(body
        ? { headers: { "content-type": "application/json" }, body }
        : {}),
    });
    if (response.status === 204)
      return new NextResponse(null, { status: 204, headers });
    return NextResponse.json(await response.json(), {
      status: response.status,
      headers,
    });
  } catch {
    return NextResponse.json(
      { error: "Сервис временно недоступен. Попробуйте ещё раз." },
      { status: 502, headers },
    );
  }
}
