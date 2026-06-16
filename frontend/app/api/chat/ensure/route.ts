import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const response = await fetchBackendAsUser("/chat/ensure", session.user.id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: unknown; message?: unknown }
      | null;

    if (response.ok) {
      return NextResponse.json(payload ?? {}, { status: response.status });
    }

    const payloadError =
      payload && typeof payload === "object" && "error" in payload ? payload.error : undefined;
    const payloadMessage =
      payload && typeof payload === "object" && "message" in payload ? payload.message : undefined;

    const derived =
      typeof payloadError === "string" && payloadError && payloadError !== "Forbidden"
        ? payloadError
        : typeof payloadMessage === "string" && payloadMessage
          ? payloadMessage
          : Array.isArray(payloadMessage) && payloadMessage.length > 0
            ? String(payloadMessage[0])
            : typeof payloadError === "string" && payloadError
              ? payloadError
              : "Чат недоступен";

    return NextResponse.json({ error: derived }, { status: response.status });
  } catch (error) {
    console.error("Error ensuring chat:", error);
    return NextResponse.json({ error: "Failed to ensure chat" }, { status: 500 });
  }
}
