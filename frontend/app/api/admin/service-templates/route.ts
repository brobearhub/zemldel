import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/core/auth/server-authorization";
import { fetchBackendAsUser } from "@/lib/backend-api";

export async function GET(_request: NextRequest) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  try {
    const { session } = gate;
    const response = await fetchBackendAsUser("/admin/service-templates", session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch templates" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching service templates (admin):", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  try {
    const { session } = gate;
    const body = await request.json();
    const response = await fetchBackendAsUser("/admin/service-templates", session.user.id, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({ error: "Failed to create template" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error creating service template (admin):", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}

