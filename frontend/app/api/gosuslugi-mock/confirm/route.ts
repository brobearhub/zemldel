import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { fetchBackendAsUser } from "@/lib/backend-api";

type Mode = "link" | "verify";

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | { mode?: unknown; returnTo?: unknown }
      | null
      | undefined;

    const mode: Mode = body?.mode === "verify" ? "verify" : "link";
    const returnTo = typeof body?.returnTo === "string" && body.returnTo.trim().length > 0 ? body.returnTo : "/profile";

    const externalSubject = `gosuslugi-mock:${session.user.id}`;

    await fetchBackendAsUser("/auth/providers/gosuslugi/link", session.user.id, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ externalSubject }),
    });

    if (mode === "verify") {
      await fetchBackendAsUser("/auth/step-up/gosuslugi/verify", session.user.id, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ externalSubject }),
      });
    }

    return NextResponse.json({ ok: true, redirectTo: returnTo }, { status: 200 });
  } catch (error) {
    console.error("Error in Gosuslugi mock confirm:", error);
    return NextResponse.json({ error: "Failed to complete Gosuslugi mock flow" }, { status: 500 });
  }
}

