import { NextResponse } from "next/server";
import { BackendApiError, fetchBackendJson } from "@/shared/api/backend/server";

const INVALID_TOKEN_MESSAGE = "Ссылка недействительна или устарела. Запросите новую.";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: unknown; password?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (token.length < 20) {
      return NextResponse.json({ error: INVALID_TOKEN_MESSAGE }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { fieldErrors: { password: "Пароль должен быть не короче 6 символов" } },
        { status: 400 },
      );
    }

    const result = await fetchBackendJson<{ message: string }>("/auth/password/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 400) {
      return NextResponse.json({ error: INVALID_TOKEN_MESSAGE }, { status: 400 });
    }

    console.error("Error resetting password:", error);
    return NextResponse.json({ error: "Не удалось обновить пароль. Попробуйте ещё раз." }, { status: 500 });
  }
}
