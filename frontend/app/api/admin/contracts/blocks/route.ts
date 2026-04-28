import { NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/core/auth/server-authorization";
import { fetchBackendAsUser } from "@/lib/backend-api";

export async function GET() {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  try {
    const response = await fetchBackendAsUser("/admin/contracts/blocks", gate.session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch contract blocks" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching admin contract blocks:", error);
    return NextResponse.json({ error: "Failed to fetch contract blocks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  try {
    const body = await request.text();
    const response = await fetchBackendAsUser("/admin/contracts/blocks", gate.session.user.id, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const payload = await response.json().catch(() => ({ error: "Failed to create contract block" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error creating admin contract block:", error);
    return NextResponse.json({ error: "Failed to create contract block" }, { status: 500 });
  }
}
