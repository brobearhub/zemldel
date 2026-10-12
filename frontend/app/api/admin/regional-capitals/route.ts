import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/core/auth/server-authorization";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

export async function GET() {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  try {
    const { session } = gate;
    const response = await fetchBackendAsUser("/admin/regional-capitals", session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch regional capitals" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching regional capitals (admin):", error);
    return NextResponse.json({ error: "Failed to fetch regional capitals" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  try {
    const { session } = gate;
    const body = await request.json();
    const response = await fetchBackendAsUser("/admin/regional-capitals", session.user.id, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({ error: "Failed to add regional capital" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error adding regional capital (admin):", error);
    return NextResponse.json({ error: "Failed to add regional capital" }, { status: 500 });
  }
}
