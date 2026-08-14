import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const response = await fetchBackendAsUser(`/pro/requests/${id}/payments`, session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to load payments" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error loading pro payments:", error);
    return NextResponse.json({ error: "Failed to load payments" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payloadIn = (await request.json().catch(() => null)) as unknown;
    const response = await fetchBackendAsUser(`/pro/requests/${id}/payments`, session.user.id, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payloadIn ?? {}),
    });
    const payload = await response.json().catch(() => ({ error: "Failed to add payment" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error adding pro payment:", error);
    return NextResponse.json({ error: "Failed to add payment" }, { status: 500 });
  }
}
