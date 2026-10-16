import { NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/core/auth/server-authorization";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;
  const { id } = await params;

  try {
    const response = await fetchBackendAsUser(
      `/admin/provider-verifications/${id}/approve`,
      gate.session.user.id,
      { method: "POST" },
    );
    const payload = await response.json().catch(() => ({ error: "Failed to approve verification" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error approving provider verification:", error);
    return NextResponse.json({ error: "Failed to approve verification" }, { status: 500 });
  }
}
