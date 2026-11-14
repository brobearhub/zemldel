import "server-only";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackend, fetchBackendAsUser } from "@/shared/api/backend/server";

/** Team and assignment endpoints always read current access from the backend. */
export async function teamProxy(
  path: string,
  request?: Request,
  publicRead = false,
) {
  try {
    const session = publicRead ? null : await getServerAuthSession();
    if (!publicRead && !session?.user?.id)
      return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
    const method = request?.method ?? "GET";
    const init: RequestInit = {
      method,
      cache: "no-store",
      ...(method !== "GET" && method !== "DELETE"
        ? {
            headers: { "content-type": "application/json" },
            body: JSON.stringify(await request!.json()),
          }
        : {}),
    };
    const response = publicRead
      ? await fetchBackend(path, init)
      : await fetchBackendAsUser(path, session!.user.id, init);
    const body = await response.json();
    return NextResponse.json(body, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Не удалось выполнить запрос. Попробуйте ещё раз." },
      { status: 502 },
    );
  }
}
