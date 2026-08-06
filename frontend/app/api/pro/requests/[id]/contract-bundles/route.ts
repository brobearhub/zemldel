import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const response = await fetchBackendAsUser(`/pro/requests/${id}/contract-bundles`, session.user.id);
  const payload = await response.json().catch(() => ({ error: "Failed to load contract bundles" }));
  return NextResponse.json(payload, { status: response.status });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const response = await fetchBackendAsUser(`/pro/requests/${id}/contract-bundles`, session.user.id, {
    method: "POST",
    body: formData,
  });
  const payload = await response.json().catch(() => ({ error: "Failed to upload contract bundle" }));
  return NextResponse.json(payload, { status: response.status });
}

