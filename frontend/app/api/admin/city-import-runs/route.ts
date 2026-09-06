import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/core/auth/server-authorization";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

export async function GET(request: NextRequest) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  const limit = request.nextUrl.searchParams.get("limit") ?? "50";

  try {
    const { session } = gate;
    const response = await fetchBackendAsUser(
      `/admin/city-import-runs?limit=${encodeURIComponent(limit)}`,
      session.user.id,
    );
    const payload = await response.json().catch(() => ({ error: "Failed to fetch city import runs" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching city import runs (admin):", error);
    return NextResponse.json({ error: "Failed to fetch city import runs" }, { status: 500 });
  }
}
