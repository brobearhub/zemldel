import { NextRequest, NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { providerId } = await params;
    const response = await fetchBackendAsUser(`/providers/${providerId}/members`, session.user.id);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch provider members" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching provider members:", error);
    return NextResponse.json({ error: "Failed to fetch provider members" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { providerId } = await params;
    const body = await request.json();
    const response = await fetchBackendAsUser(`/providers/${providerId}/members`, session.user.id, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({ error: "Failed to add provider manager" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error adding provider manager:", error);
    return NextResponse.json({ error: "Failed to add provider manager" }, { status: 500 });
  }
}
