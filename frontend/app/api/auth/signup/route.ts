import { NextResponse } from "next/server";
import { fetchBackend } from "@/shared/api/backend/server";

type AcceptedLegal = {
  terms?: unknown;
  privacy?: unknown;
  consent?: unknown;
};

type FieldErrors = Partial<Record<"name" | "email" | "password" | "customerCityId" | "acceptedLegal", string>>;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: unknown;
      password?: unknown;
      name?: unknown;
      customerCityId?: unknown;
      acceptedLegal?: AcceptedLegal;
    };

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const customerCityId = typeof body.customerCityId === "string" ? body.customerCityId.trim() : "";
    const terms =
      typeof body.acceptedLegal?.terms === "string" ? body.acceptedLegal.terms.trim() : "";
    const privacy =
      typeof body.acceptedLegal?.privacy === "string" ? body.acceptedLegal.privacy.trim() : "";
    const consent =
      typeof body.acceptedLegal?.consent === "string" ? body.acceptedLegal.consent.trim() : "";

    const fieldErrors: FieldErrors = {};
    if (!email) fieldErrors.email = "Введите email";
    else if (!isValidEmail(email)) fieldErrors.email = "Введите корректный email";
    if (!password) fieldErrors.password = "Введите пароль";
    else if (password.length < 6) fieldErrors.password = "Пароль должен быть не короче 6 символов";
    if (!customerCityId) fieldErrors.customerCityId = "Выберите локацию из списка";
    if (!terms || !privacy || !consent) fieldErrors.acceptedLegal = "Нужно принять соглашение, политику и согласие";

    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ fieldErrors }, { status: 400 });
    }

    const response = await fetchBackend("/auth/signup", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        name,
        customerCityId,
        acceptedLegal: { terms, privacy, consent },
      }),
    });
    const payload = (await response.json().catch(() => null)) as unknown;

    if (response.ok) {
      return NextResponse.json(payload, { status: response.status });
    }

    // 409 обычно означает конфликт уникальности (чаще всего email уже занят).
    if (response.status === 409) {
      return NextResponse.json(
        { fieldErrors: { email: "Этот email уже зарегистрирован" } satisfies FieldErrors },
        { status: 409 },
      );
    }

    const message =
      typeof payload === "object" && payload && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : typeof payload === "object" && payload && "message" in payload && typeof payload.message === "string"
          ? payload.message
          : "Не удалось зарегистрироваться";

    // Best-effort маппинг бэкенд-ошибок на поля (если бэк вернул строку).
    const backendFieldErrors: FieldErrors = {};
    const lc = message.toLowerCase();
    if (lc.includes("email")) backendFieldErrors.email = message;
    if (lc.includes("password")) backendFieldErrors.password = message;
    if (lc === "conflict") backendFieldErrors.email = "Этот email уже зарегистрирован";

    return NextResponse.json(
      {
        fieldErrors: Object.keys(backendFieldErrors).length > 0 ? backendFieldErrors : undefined,
        error: message,
      },
      { status: response.status },
    );
  } catch (error) {
    console.error("Error signing up:", error);
    return NextResponse.json({ error: "Failed to sign up" }, { status: 500 });
  }
}
