import { NextResponse } from "next/server";
import { fetchBackend, fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await getServerAuthSession();
    const response = session?.user?.id
      ? await fetchBackendAsUser(`/users/${id}/public`, session.user.id)
      : await fetchBackend(`/users/${id}/public`);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch profile" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching public user profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
