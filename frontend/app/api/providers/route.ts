import { NextRequest, NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function GET() {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetchBackendAsUser("/providers/mine", session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch providers" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching providers:", error);
    return NextResponse.json({ error: "Failed to fetch providers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const response = await fetchBackendAsUser("/providers", session.user.id, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({ error: "Failed to create provider" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error creating provider:", error);
    return NextResponse.json({ error: "Failed to create provider" }, { status: 500 });
  }
}
