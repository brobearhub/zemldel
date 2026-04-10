import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetchBackendAsUser("/pro/inbox-settings", session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch inbox settings" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching inbox settings:", error);
    return NextResponse.json({ error: "Failed to fetch inbox settings" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.text();
    const response = await fetchBackendAsUser("/pro/inbox-settings", session.user.id, {
      method: "PUT",
      headers: {
        "content-type": request.headers.get("content-type") ?? "application/json",
      },
      body: body.length ? body : "{}",
    });
    const payload = await response.json().catch(() => ({ error: "Failed to save inbox settings" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error saving inbox settings:", error);
    return NextResponse.json({ error: "Failed to save inbox settings" }, { status: 500 });
  }
}

