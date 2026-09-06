import { NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/core/auth/server-authorization";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  const { runId } = await context.params;

  try {
    const { session } = gate;
    const response = await fetchBackendAsUser(
      `/admin/city-import-runs/${encodeURIComponent(runId)}/events`,
      session.user.id,
    );
    const payload = await response.json().catch(() => ({ error: "Failed to fetch import events" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching city import events (admin):", error);
    return NextResponse.json({ error: "Failed to fetch import events" }, { status: 500 });
  }
}
