import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

type Params = { params: Promise<{ providerId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { providerId } = await params;
    const body = await request.json().catch(() => null);
    const response = await fetchBackendAsUser(`/providers/${providerId}/slug`, session.user.id, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : "{}",
    });
    const payload = await response.json().catch(() => ({ error: "Failed to update slug" }));
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Failed to update slug" }, { status: 500 });
  }
}
