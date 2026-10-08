import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

type Params = { params: Promise<{ id: string }> };

async function proxy(request: Request, params: Params["params"], method: "GET" | "POST") {
  const session = await getServerAuthSession();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const scope = new URL(request.url).searchParams.get("scope") === "provider" ? "provider" : "user";
  const path = `/stories/conversations/${encodeURIComponent(id)}/messages?scope=${scope}`;
  const rawBody = method === "POST" ? (await request.text()).trim() : "";
  const response = await fetchBackendAsUser(path, userId, {
    method,
    ...(rawBody
      ? { body: rawBody, headers: { "content-type": request.headers.get("content-type") ?? "application/json" } }
      : {}),
  });
  const payload = await response.json().catch(() => ({ error: "Story conversation messages failed" }));
  return NextResponse.json(payload, { status: response.status });
}

export async function GET(request: Request, context: Params) {
  try {
    return await proxy(request, context.params, "GET");
  } catch (error) {
    console.error("Error proxying story conversation messages:", error);
    return NextResponse.json({ error: "Story conversation messages failed" }, { status: 500 });
  }
}

export async function POST(request: Request, context: Params) {
  try {
    return await proxy(request, context.params, "POST");
  } catch (error) {
    console.error("Error proxying story conversation message:", error);
    return NextResponse.json({ error: "Story conversation messages failed" }, { status: 500 });
  }
}
