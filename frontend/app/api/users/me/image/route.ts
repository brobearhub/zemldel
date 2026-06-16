import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const response = await fetchBackendAsUser("/users/me/image", session.user.id, {
    method: "POST",
    body: formData,
  });
  const payload = await response.json().catch(() => ({ error: "Failed to upload profile image" }));
  return NextResponse.json(payload, { status: response.status });
}

export async function DELETE() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const response = await fetchBackendAsUser("/users/me/image", session.user.id, {
    method: "DELETE",
  });
  const payload = await response.json().catch(() => ({ error: "Failed to delete profile image" }));
  return NextResponse.json(payload, { status: response.status });
}

