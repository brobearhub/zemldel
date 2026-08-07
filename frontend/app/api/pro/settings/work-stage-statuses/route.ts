import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const response = await fetchBackendAsUser(`/pro/settings/work-stage-statuses`, session.user.id);
  const payload = await response.json().catch(() => ({ error: "Failed to load statuses" }));
  return NextResponse.json(payload, { status: response.status });
}

export async function PUT(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payloadIn = await request.json().catch(() => null);
  const response = await fetchBackendAsUser(`/pro/settings/work-stage-statuses`, session.user.id, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payloadIn ?? {}),
  });
  const payload = await response.json().catch(() => ({ error: "Failed to save statuses" }));
  return NextResponse.json(payload, { status: response.status });
}
