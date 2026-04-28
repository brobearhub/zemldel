import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetchBackendAsUser(`/payments/${id}`, session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to load payment" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error loading payment:", error);
    return NextResponse.json({ error: "Failed to load payment" }, { status: 500 });
  }
}
