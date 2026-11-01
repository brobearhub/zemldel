import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const response = await fetchBackendAsUser(
      `/requests/mine/${id}/cancel-provider-selection`,
      session.user.id,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: await request.text(),
      },
    );
    const payload = await response.json().catch(() => ({ error: "Не удалось отменить выбор" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error cancelling provider selection:", error);
    return NextResponse.json({ error: "Не удалось отменить выбор" }, { status: 500 });
  }
}
