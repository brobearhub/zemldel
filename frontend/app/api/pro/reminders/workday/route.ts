import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const response = await fetchBackendAsUser("/pro/reminders/workday", session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch workday reminders" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching workday reminders:", error);
    return NextResponse.json({ error: "Failed to fetch workday reminders" }, { status: 500 });
  }
}
