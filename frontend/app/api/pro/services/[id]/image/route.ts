import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const response = await fetchBackendAsUser(`/pro/services/${id}/image`, session.user.id, {
    method: "POST",
    body: formData,
  });
  const payload = await response.json().catch(() => ({ error: "Failed to upload service image" }));
  return NextResponse.json(payload, { status: response.status });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const response = await fetchBackendAsUser(`/pro/services/${id}/image`, session.user.id, {
    method: "DELETE",
  });
  const payload = await response.json().catch(() => ({ error: "Failed to delete service image" }));
  return NextResponse.json(payload, { status: response.status });
}

