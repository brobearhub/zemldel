import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bodyText = await request.text();
    const response = await fetchBackendAsUser("/auth/providers/gosuslugi/link", session.user.id, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: bodyText,
    });

    const payload = await response.json().catch(() => ({ error: "Failed to link Gosuslugi" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error linking Gosuslugi:", error);
    return NextResponse.json({ error: "Failed to link Gosuslugi" }, { status: 500 });
  }
}

