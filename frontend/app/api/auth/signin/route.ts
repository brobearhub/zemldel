import { NextResponse } from "next/server";
import { BackendApiError, fetchBackendJson } from "@/shared/api/backend/server";

type FieldErrors = Partial<Record<"email" | "password", string>>;

function isValidEmail(value: string): boolean {
  // Why: серверная валидация должна быть предсказуемой и не слишком строгой.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    const fieldErrors: FieldErrors = {};
    if (!email) fieldErrors.email = "Введите email";
    else if (!isValidEmail(email)) fieldErrors.email = "Введите корректный email";
    if (!password) fieldErrors.password = "Введите пароль";

    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ fieldErrors }, { status: 400 });
    }

    // Проверяем креды на бэкенде тем же эндпоинтом, что использует CredentialsProvider.
    await fetchBackendJson("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 401) {
      return NextResponse.json(
        { fieldErrors: { password: "Неверный email или пароль" } satisfies FieldErrors },
        { status: 401 },
      );
    }

    console.error("Error validating sign in:", error);
    return NextResponse.json({ error: "Failed to sign in" }, { status: 500 });
  }
}

