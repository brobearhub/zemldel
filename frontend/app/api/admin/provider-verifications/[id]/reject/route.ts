import { NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/core/auth/server-authorization";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const body = await request.json().catch(() => null);

  try {
    const response = await fetchBackendAsUser(
      `/admin/provider-verifications/${id}/reject`,
      gate.session.user.id,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const payload = await response.json().catch(() => ({ error: "Failed to reject verification" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error rejecting provider verification:", error);
    return NextResponse.json({ error: "Failed to reject verification" }, { status: 500 });
  }
}
