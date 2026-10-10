import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

type Params = { params: Promise<{ id: string; commentId: string }> };

async function proxy(request: Request, params: Params["params"], method: "PATCH" | "DELETE") {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, commentId } = await params;
  const response = await fetchBackendAsUser(`/stories/${id}/comments/${commentId}`, session.user.id, {
    method,
    ...(method === "PATCH"
      ? {
          body: await request.text(),
          headers: { "content-type": request.headers.get("content-type") ?? "application/json" },
        }
      : {}),
  });
  const payload = await response.json().catch(() => ({ error: "Failed to update comment" }));
  return NextResponse.json(payload, { status: response.status });
}

export async function PATCH(request: Request, context: Params) {
  try {
    return await proxy(request, context.params, "PATCH");
  } catch (error) {
    console.error("Error updating story comment:", error);
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: Params) {
  try {
    return await proxy(request, context.params, "DELETE");
  } catch (error) {
    console.error("Error deleting story comment:", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
