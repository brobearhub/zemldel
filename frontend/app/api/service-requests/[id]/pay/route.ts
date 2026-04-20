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

    const response = await fetchBackendAsUser(`/service-requests/mine/${id}/pay`, session.user.id, {
      method: "POST",
    });
    const payload = await response.json().catch(() => ({ error: "Failed to pay" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error paying:", error);
    return NextResponse.json({ error: "Failed to pay" }, { status: 500 });
  }
}

