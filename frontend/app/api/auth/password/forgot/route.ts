import { NextResponse } from "next/server";
import { fetchBackendJson } from "@/shared/api/backend/server";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ fieldErrors: { email: "Укажите корректный email" } }, { status: 400 });
    }

    const result = await fetchBackendJson<{ message: string }>("/auth/password/forgot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error requesting password reset:", error);
    return NextResponse.json({ error: "Не удалось отправить ссылку. Попробуйте ещё раз." }, { status: 500 });
  }
}
