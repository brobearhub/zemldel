import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

function passportJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store");
  return NextResponse.json(body, { ...init, headers });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return passportJson({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetchBackendAsUser(`/pro/requests/${id}/passport`, session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch passport" }));
    return passportJson(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching request passport:", error);
    return passportJson({ error: "Failed to fetch passport" }, { status: 500 });
  }
}
