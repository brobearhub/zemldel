import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetchBackendAsUser(`/requests/mine/${id}`, session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch request" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching request:", error);
    return NextResponse.json({ error: "Failed to fetch request" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetchBackendAsUser(`/requests/mine/${id}`, session.user.id, {
      method: "DELETE",
    });
    const payload = await response.json().catch(() => ({ error: "Failed to delete request" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error deleting request:", error);
    return NextResponse.json({ error: "Failed to delete request" }, { status: 500 });
  }
}
