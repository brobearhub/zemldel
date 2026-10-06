import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

type Params = { params: Promise<{ providerId: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { providerId } = await params;
    const formData = await request.formData();
    const response = await fetchBackendAsUser(`/providers/${providerId}/image`, session.user.id, {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => ({ error: "Failed to upload provider image" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error uploading provider image:", error);
    return NextResponse.json({ error: "Failed to upload provider image" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { providerId } = await params;
    const response = await fetchBackendAsUser(`/providers/${providerId}/image`, session.user.id, {
      method: "DELETE",
    });
    const payload = await response.json().catch(() => ({ error: "Failed to delete provider image" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error deleting provider image:", error);
    return NextResponse.json({ error: "Failed to delete provider image" }, { status: 500 });
  }
}

