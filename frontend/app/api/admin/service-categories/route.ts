import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/core/auth/server-authorization";
import { fetchBackendAsUser } from "@/lib/backend-api";

export async function GET(_request: NextRequest) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  try {
    const { session } = gate;
    const response = await fetchBackendAsUser("/admin/service-categories", session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch categories" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching service categories (admin):", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  try {
    const { session } = gate;
    const body = await request.json();
    const response = await fetchBackendAsUser("/admin/service-categories", session.user.id, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({ error: "Failed to create category" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error creating service category (admin):", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}

