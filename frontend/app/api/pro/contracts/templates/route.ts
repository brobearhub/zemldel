import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const response = await fetchBackendAsUser("/pro/contracts/templates", session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch templates" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching contract templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.text();
    const response = await fetchBackendAsUser("/pro/contracts/templates", session.user.id, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const payload = await response.json().catch(() => ({ error: "Failed to create template" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error creating contract template:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}

