import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const response = await fetchBackendAsUser("/stories/follow", session.user.id, {
      method: "POST",
      body: await request.text(),
      headers: { "content-type": "application/json" },
    });
    const payload = await response.json().catch(() => ({ error: "Failed to follow" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error following story author:", error);
    return NextResponse.json({ error: "Failed to follow" }, { status: 500 });
  }
}
