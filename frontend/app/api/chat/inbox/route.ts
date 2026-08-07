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

    const response = await fetchBackendAsUser(`/chat/inbox?${search.toString()}`, session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch inbox" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching chat inbox:", error);
    return NextResponse.json({ error: "Failed to fetch inbox" }, { status: 500 });
  }
}

