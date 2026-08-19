import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

async function withSession() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, error: null };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const { id, index } = await params;
  try {
    const auth = await withSession();
    if (auth.error) return auth.error;

    const body = await request.text();
    const response = await fetchBackendAsUser(
      `/pro/requests/${id}/cadastral-numbers/${index}`,
      auth.session!.user!.id,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body,
      },
    );
    const payload = await response.json().catch(() => ({ error: "Failed to update cadastral number" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error updating pro cadastral number:", error);
    return NextResponse.json({ error: "Failed to update cadastral number" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const { id, index } = await params;
  try {
    const auth = await withSession();
    if (auth.error) return auth.error;

    const response = await fetchBackendAsUser(
      `/pro/requests/${id}/cadastral-numbers/${index}`,
      auth.session!.user!.id,
      { method: "DELETE" },
    );
    const payload = await response.json().catch(() => ({ error: "Failed to delete cadastral number" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error deleting pro cadastral number:", error);
    return NextResponse.json({ error: "Failed to delete cadastral number" }, { status: 500 });
  }
}
