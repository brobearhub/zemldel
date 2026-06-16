import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function PATCH(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const response = await fetchBackendAsUser("/users/me", session.user.id, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : "{}",
    });
    const payload = await response.json().catch(() => ({ error: "Failed to update profile" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

