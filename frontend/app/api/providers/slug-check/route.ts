import { type NextRequest, NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const slug = request.nextUrl.searchParams.get("slug") ?? "";
    const response = await fetchBackendAsUser(
      `/providers/slug-check?slug=${encodeURIComponent(slug)}`,
      session.user.id,
    );
    const payload = await response.json().catch(() => ({ available: false }));
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Failed to check slug" }, { status: 500 });
  }
}
