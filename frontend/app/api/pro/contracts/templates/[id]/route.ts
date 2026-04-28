import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const response = await fetchBackendAsUser(`/pro/contracts/templates/${id}`, session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch template" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching contract template:", error);
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.text();
    const response = await fetchBackendAsUser(`/pro/contracts/templates/${id}`, session.user.id, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body,
    });
    const payload = await response.json().catch(() => ({ error: "Failed to update template" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error updating contract template:", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const response = await fetchBackendAsUser(`/pro/contracts/templates/${id}`, session.user.id, { method: "DELETE" });
    const payload = await response.json().catch(() => ({ error: "Failed to delete template" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error deleting contract template:", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}

