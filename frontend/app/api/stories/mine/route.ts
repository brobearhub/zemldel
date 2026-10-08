import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const scope = new URL(request.url).searchParams.get("scope") === "provider" ? "provider" : "user";
    const response = await fetchBackendAsUser(`/stories/mine?scope=${scope}`, session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch stories" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching my stories:", error);
    return NextResponse.json({ error: "Failed to fetch stories" }, { status: 500 });
  }
}
