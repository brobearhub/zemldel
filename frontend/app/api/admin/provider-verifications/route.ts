import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/core/auth/server-authorization";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

export async function GET(request: NextRequest) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  const status = request.nextUrl.searchParams.get("status") ?? "";
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  const query = params.size > 0 ? `?${params.toString()}` : "";

  try {
    const response = await fetchBackendAsUser(
      `/admin/provider-verifications${query}`,
      gate.session.user.id,
    );
    const payload = await response.json().catch(() => ({ error: "Failed to fetch verifications" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching provider verifications:", error);
    return NextResponse.json({ error: "Failed to fetch verifications" }, { status: 500 });
  }
}
