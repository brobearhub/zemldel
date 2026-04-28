import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const response = await fetchBackendAsUser(`/contracts/requests/${id}/instances`, session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch contracts" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching contracts for request (customer):", error);
    return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
  }
}

