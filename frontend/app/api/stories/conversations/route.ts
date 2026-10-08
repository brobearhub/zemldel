import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const scope = new URL(request.url).searchParams.get("scope") === "provider" ? "provider" : "user";
    const response = await fetchBackendAsUser(`/stories/conversations?scope=${scope}`, session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch story conversations" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching story conversations:", error);
    return NextResponse.json({ error: "Failed to fetch story conversations" }, { status: 500 });
  }
}
