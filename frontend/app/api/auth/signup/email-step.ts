import { NextResponse } from "next/server";
import { fetchBackend } from "@/shared/api/backend/server";
import { SIGNUP_PROOF_COOKIE, signupProofCookieOptions } from "./proof-cookie";

type EmailStep = "/auth/signup/start" | "/auth/signup/verify" | "/auth/signin/email";

export async function handleEmailStep(request: Request, path: EmailStep) {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return NextResponse.json({ error: "Ожидается JSON" }, { status: 415 });
  }
  const body = await request.json().catch(() => null);
  if (typeof body?.email !== "string") {
    return NextResponse.json({ error: "Введите email" }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const fields = {
    email,
    ...(path === "/auth/signup/verify" && { code: body.code }),
    ...(path === "/auth/signup/start" && { accountKind: body.accountKind }),
  };
  try {
    const upstream = await fetchBackend(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(fields),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      const fallback = upstream.status < 500 ? "Проверьте введённые данные" : "Попробуйте ещё раз позже";
      const error = typeof data?.message === "string" && upstream.status < 500
        ? data.message
        : fallback;
      return NextResponse.json({ error }, { status: upstream.status });
    }

    if (path !== "/auth/signup/verify") {
      return NextResponse.json({
        status: data.status,
        accountKind: data.accountKind,
        resendAt: data.resendAt,
        ...(data.codeUnavailable === true && { codeUnavailable: true }),
      });
    }
    if (data.status === "password_required") {
      return NextResponse.json({ status: data.status, email: data.email });
    }
    if (data.status !== "registration_required" || typeof data.registrationToken !== "string") {
      throw new Error("Invalid signup verification response");
    }
    const response = NextResponse.json({ status: data.status, email: data.email, accountKind: data.accountKind });
    response.cookies.set(SIGNUP_PROOF_COOKIE, data.registrationToken, {
      ...signupProofCookieOptions,
      maxAge: 3600,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Сервис подтверждения почты временно недоступен. Попробуйте ещё раз." }, { status: 502 });
  }
}
