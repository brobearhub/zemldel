import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

type Params = { params: Promise<{ id: string }> };

async function requireUserId() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return null;
  return session.user.id;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const response = await fetchBackendAsUser(`/requests/${id}/reviews`, userId);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch reviews" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching request reviews:", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const body = await request.text();
    const response = await fetchBackendAsUser(`/requests/${id}/reviews`, userId, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const payload = await response.json().catch(() => ({ error: "Failed to create review" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}
