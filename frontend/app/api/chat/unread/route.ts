import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const role = url.searchParams.get("role");
    const search = new URLSearchParams();
    if (role) search.set("role", role);

    const response = await fetchBackendAsUser(`/chat/unread?${search.toString()}`, session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch unread counts" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching unread counts:", error);
    return NextResponse.json({ error: "Failed to fetch unread counts" }, { status: 500 });
  }
}
