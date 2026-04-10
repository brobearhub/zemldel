import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetchBackendAsUser(`/service-requests/mine/${id}/confirm-order`, session.user.id, {
      method: "POST",
      body: "{}",
    });
    const payload = await response.json().catch(() => ({ error: "Failed to confirm order" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error confirming order (customer):", error);
    return NextResponse.json({ error: "Failed to confirm order" }, { status: 500 });
  }
}

