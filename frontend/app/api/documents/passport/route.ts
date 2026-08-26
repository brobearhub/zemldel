import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

async function requireSession() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return null;
  }
  return session;
}

export async function GET() {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetchBackendAsUser("/documents/passport/mine", session.user.id, { method: "GET" });
    const payload = await response.json().catch(() => ({ error: "Failed to fetch passport" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching passport:", error);
    return NextResponse.json({ error: "Failed to fetch passport" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.text();
    const response = await fetchBackendAsUser("/documents/passport/mine", session.user.id, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body,
    });
    const payload = await response.json().catch(() => ({ error: "Failed to save passport" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error saving passport:", error);
    return NextResponse.json({ error: "Failed to save passport" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetchBackendAsUser("/documents/passport/mine", session.user.id, { method: "DELETE" });
    const payload = await response.json().catch(() => ({ error: "Failed to delete passport" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error deleting passport:", error);
    return NextResponse.json({ error: "Failed to delete passport" }, { status: 500 });
  }
}
