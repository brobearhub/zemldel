import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

type Params = { params: Promise<{ id: string; replyId: string }> };

async function proxy(request: Request, params: Params["params"], method: "GET" | "POST") {
  const session = await getServerAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, replyId } = await params;
  const rawBody = method === "POST" ? (await request.text()).trim() : "";
  const response = await fetchBackendAsUser(`/stories/${id}/replies/${replyId}/messages`, userId, {
    method,
    ...(rawBody
      ? { body: rawBody, headers: { "content-type": request.headers.get("content-type") ?? "application/json" } }
      : {}),
  });
  const payload = await response.json().catch(() => ({ error: "Story reply messages failed" }));
  return NextResponse.json(payload, { status: response.status });
}

export async function GET(request: Request, context: Params) {
  try {
    return await proxy(request, context.params, "GET");
  } catch (error) {
    console.error("Error proxying story reply messages:", error);
    return NextResponse.json({ error: "Story reply messages failed" }, { status: 500 });
  }
}

export async function POST(request: Request, context: Params) {
  try {
    return await proxy(request, context.params, "POST");
  } catch (error) {
    console.error("Error proxying story reply message:", error);
    return NextResponse.json({ error: "Story reply messages failed" }, { status: 500 });
  }
}
