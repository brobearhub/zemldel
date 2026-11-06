import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

export async function billingProxy(
  request: NextRequest,
  providerId: string,
  suffix = "",
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  if (!/^[a-f\d-]{36}$/i.test(providerId))
    return NextResponse.json(
      { error: "Некорректный профиль" },
      { status: 400 },
    );
  if (
    request.method === "POST" &&
    request.headers.get("origin") !==
      new URL(process.env.NEXTAUTH_URL ?? request.nextUrl.origin).origin
  ) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 },
    );
  }
  try {
    const response = await fetchBackendAsUser(
      `/billing/providers/${providerId}${suffix}`,
      session.user.id,
      {
        method: request.method,
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        ...(request.method === "POST"
          ? { body: JSON.stringify(await request.json()) }
          : {}),
      },
    );
    return NextResponse.json(await response.json(), {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Сервис оплаты недоступен. Проверьте статус платежа перед повторной оплатой.",
      },
      { status: 503 },
    );
  }
}
