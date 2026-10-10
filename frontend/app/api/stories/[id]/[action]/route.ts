import { NextResponse } from "next/server";
import { fetchBackend, fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

type Params = { params: Promise<{ id: string; action: string }> };

const ACTIONS = new Set(["view", "save", "reply", "profile-open", "insights"]);

async function proxy(request: Request, params: Params["params"], method: string) {
  const { id, action } = await params;
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const session = await getServerAuthSession();
  const userId = session?.user?.id ?? null;
  const guestAllowed = action === "view" || action === "profile-open";
  if (!guestAllowed && !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const incoming = new URL(request.url).searchParams;
  const forwarded = new URLSearchParams();
  const timeZone = incoming.get("timeZone");
  if (action === "insights" && timeZone) forwarded.set("timeZone", timeZone);
  const scope = incoming.get("scope");
  if (scope === "user" || scope === "provider") forwarded.set("scope", scope);
  const qs = forwarded.size > 0 ? `?${forwarded.toString()}` : "";
  // Пустой POST (просмотр, закладка) нельзя слать как application/json:
  // axios превращает пустую строку в невалидный JSON, и бэкенд отвечает 400.
  const rawBody = method === "POST" ? (await request.text()).trim() : "";
  const init: RequestInit = {
    method,
    ...(rawBody
      ? { body: rawBody, headers: { "content-type": request.headers.get("content-type") ?? "application/json" } }
      : {}),
  };
  const path = `/stories/${id}/${action}${qs}`;
  const response = userId ? await fetchBackendAsUser(path, userId, init) : await fetchBackend(path, init);
  const payload = await response.json().catch(() => ({ error: "Story request failed" }));
  return NextResponse.json(payload, { status: response.status });
}

export async function GET(request: Request, context: Params) {
  try {
    return await proxy(request, context.params, "GET");
  } catch (error) {
    console.error("Error proxying story action:", error);
    return NextResponse.json({ error: "Story request failed" }, { status: 500 });
  }
}

export async function POST(request: Request, context: Params) {
  try {
    return await proxy(request, context.params, "POST");
  } catch (error) {
    console.error("Error proxying story action:", error);
    return NextResponse.json({ error: "Story request failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: Params) {
  try {
    return await proxy(request, context.params, "DELETE");
  } catch (error) {
    console.error("Error proxying story action:", error);
    return NextResponse.json({ error: "Story request failed" }, { status: 500 });
  }
}
