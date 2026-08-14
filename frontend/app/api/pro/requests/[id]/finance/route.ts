import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payloadIn = (await request.json().catch(() => null)) as unknown;
    const response = await fetchBackendAsUser(`/pro/requests/${id}/finance`, session.user.id, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payloadIn ?? {}),
    });
    const payload = await response.json().catch(() => ({ error: "Failed to save finance" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error saving pro finance:", error);
    return NextResponse.json({ error: "Failed to save finance" }, { status: 500 });
  }
}
