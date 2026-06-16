import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const response = await fetchBackendAsUser(`/pro/reminders/${id}`, session.user.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({ error: "Failed to update reminder" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error updating reminder:", error);
    return NextResponse.json({ error: "Failed to update reminder" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const response = await fetchBackendAsUser(`/pro/reminders/${id}`, session.user.id, {
      method: "DELETE",
    });
    if (response.status === 200 || response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    const payload = await response.json().catch(() => ({ error: "Failed to delete reminder" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return NextResponse.json({ error: "Failed to delete reminder" }, { status: 500 });
  }
}
