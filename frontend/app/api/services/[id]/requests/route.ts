import { NextRequest, NextResponse } from "next/server";
import { fetchBackend, fetchBackendAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const session = await getServerAuthSession();

    const response = session?.user?.id
      ? await fetchBackendAsUser(`/services/${id}/requests`, session.user.id, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetchBackend(`/services/${id}/requests`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });

    const payload = await response.json().catch(() => ({ error: "Failed to create request" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error creating service request:", error);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}

