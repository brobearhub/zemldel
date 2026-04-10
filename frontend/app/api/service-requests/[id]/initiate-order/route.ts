import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const response = await fetchBackendAsUser(`/service-requests/mine/${id}/initiate-order`, session.user.id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const payload = await response.json().catch(() => ({ error: "Failed to initiate order" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error initiating order (customer):", error);
    return NextResponse.json({ error: "Failed to initiate order" }, { status: 500 });
  }
}

