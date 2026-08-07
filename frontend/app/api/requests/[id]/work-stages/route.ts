import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const response = await fetchBackendAsUser(`/requests/mine/${id}/work-stages`, session.user.id);
  const payload = await response.json().catch(() => ({ error: "Failed to load work stages" }));
  return NextResponse.json(payload, { status: response.status });
}
