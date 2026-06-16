import { NextRequest, NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetchBackendAsUser(`/pro/services/${id}`, session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch service" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching pro service:", error);
    return NextResponse.json({ error: "Failed to fetch service" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const response = await fetchBackendAsUser(`/pro/services/${id}`, session.user.id, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({ error: "Failed to update service" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error updating pro service:", error);
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetchBackendAsUser(`/pro/services/${id}`, session.user.id, {
      method: "DELETE",
    });
    const payload = await response.json().catch(() => ({ error: "Failed to delete service" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error deleting pro service:", error);
    return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
  }
}
