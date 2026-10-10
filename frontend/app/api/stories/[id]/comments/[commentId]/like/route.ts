import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

type Params = { params: Promise<{ id: string; commentId: string }> };

async function proxy(params: Params["params"], method: "POST" | "DELETE") {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, commentId } = await params;
  const response = await fetchBackendAsUser(`/stories/${id}/comments/${commentId}/like`, session.user.id, {
    method,
  });
  const payload = await response.json().catch(() => ({ error: "Failed to like comment" }));
  return NextResponse.json(payload, { status: response.status });
}

export async function POST(_request: Request, context: Params) {
  try {
    return await proxy(context.params, "POST");
  } catch (error) {
    console.error("Error liking story comment:", error);
    return NextResponse.json({ error: "Failed to like comment" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Params) {
  try {
    return await proxy(context.params, "DELETE");
  } catch (error) {
    console.error("Error unliking story comment:", error);
    return NextResponse.json({ error: "Failed to unlike comment" }, { status: 500 });
  }
}
