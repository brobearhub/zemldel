import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/shared/api/backend/server";

export async function GET(_request: NextRequest) {
  try {
    const response = await fetchBackend("/users");
    const payload = await response.json().catch(() => ({ error: "Failed to fetch users" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: unknown; name?: unknown };

    if (typeof body.email !== "string" || body.email.length === 0) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const response = await fetchBackend("/users", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: body.email,
        name: typeof body.name === "string" ? body.name : undefined,
      }),
    });
    const payload = await response.json().catch(() => ({ error: "Failed to create user" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
