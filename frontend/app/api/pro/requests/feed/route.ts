import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const search = new URL(request.url).searchParams.toString();
    const path = search.length > 0 ? `/pro/requests/feed?${search}` : "/pro/requests/feed";
    const response = await fetchBackendAsUser(path, session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch feed" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching pro request feed:", error);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}
