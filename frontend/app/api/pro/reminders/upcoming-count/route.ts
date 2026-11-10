import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers },
      );
    }
    const response = await fetchBackendAsUser(
      "/pro/reminders/upcoming-count",
      session.user.id,
      { cache: "no-store" },
    );
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status, headers });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch reminder count" },
      { status: 502, headers },
    );
  }
}
