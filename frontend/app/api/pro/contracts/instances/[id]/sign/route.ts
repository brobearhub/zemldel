import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const response = await fetchBackendAsUser(`/pro/contracts/instances/${id}/sign`, session.user.id, { method: "POST" });
    const payload = await response.json().catch(() => ({ error: "Failed to sign contract" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error signing contract (provider):", error);
    return NextResponse.json({ error: "Failed to sign contract" }, { status: 500 });
  }
}

