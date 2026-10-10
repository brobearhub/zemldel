import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackend, fetchBackendAsUser } from "@/shared/api/backend/server";

type Params = { params: Promise<{ id: string }> };

function scopeQuery(request: Request): string {
  const scope = new URL(request.url).searchParams.get("scope");
  if (scope === "user" || scope === "provider") return `?scope=${scope}`;
  return "";
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await getServerAuthSession();
    const path = `/stories/${id}/comments${scopeQuery(request)}`;
    const response = session?.user?.id
      ? await fetchBackendAsUser(path, session.user.id)
      : await fetchBackend(path);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch comments" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching story comments:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const response = await fetchBackendAsUser(`/stories/${id}/comments${scopeQuery(request)}`, session.user.id, {
      method: "POST",
      body: await request.text(),
      headers: { "content-type": request.headers.get("content-type") ?? "application/json" },
    });
    const payload = await response.json().catch(() => ({ error: "Failed to comment" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error creating story comment:", error);
    return NextResponse.json({ error: "Failed to comment" }, { status: 500 });
  }
}
