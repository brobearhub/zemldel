import { NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/core/auth/server-authorization";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;
  const { id } = await params;

  try {
    const response = await fetchBackendAsUser(
      `/admin/provider-verifications/${id}`,
      gate.session.user.id,
    );
    const payload = await response.json().catch(() => ({ error: "Failed to fetch verification" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching provider verification:", error);
    return NextResponse.json({ error: "Failed to fetch verification" }, { status: 500 });
  }
}
