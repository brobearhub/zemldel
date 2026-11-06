import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

function passportJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store");
  return NextResponse.json(body, { ...init, headers });
}

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
      return passportJson({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetchBackendAsUser("/documents/passport/mine", session.user.id, { method: "GET" });
    // Nest returns an empty successful response when no passport exists.
    const body = await response.text();
    if (response.ok && !body.trim()) {
      return passportJson(null);
    }
    try {
      const payload: unknown = JSON.parse(body);
      return passportJson(payload, { status: response.status });
    } catch {
      return passportJson(
        { error: "Не удалось загрузить анкету" },
        { status: response.ok ? 502 : response.status },
      );
    }
  } catch (error) {
    console.error("Error fetching passport:", error);
    return passportJson({ error: "Failed to fetch passport" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireSession();
    if (!session) {
      return passportJson({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.text();
    const response = await fetchBackendAsUser("/documents/passport/mine", session.user.id, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body,
    });
    const payload = await response.json().catch(() => ({ error: "Failed to save passport" }));
    return passportJson(payload, { status: response.status });
  } catch (error) {
    console.error("Error saving passport:", error);
    return passportJson({ error: "Failed to save passport" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await requireSession();
    if (!session) {
      return passportJson({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetchBackendAsUser("/documents/passport/mine", session.user.id, { method: "DELETE" });
    const payload = await response.json().catch(() => ({ error: "Failed to delete passport" }));
    return passportJson(payload, { status: response.status });
  } catch (error) {
    console.error("Error deleting passport:", error);
    return passportJson({ error: "Failed to delete passport" }, { status: 500 });
  }
}
