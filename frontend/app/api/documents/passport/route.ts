import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

function hasFreshGosuslugiStepUp(input: { linkedAuthProviders?: unknown; stepUpVerifiedAt?: unknown }) {
  const linked = Array.isArray(input.linkedAuthProviders) && input.linkedAuthProviders.includes("GOSUSLUGI");
  if (!linked) return false;

  const verifiedAt =
    typeof input.stepUpVerifiedAt === "object" &&
    input.stepUpVerifiedAt &&
    "GOSUSLUGI" in input.stepUpVerifiedAt &&
    typeof (input.stepUpVerifiedAt as any).GOSUSLUGI === "string"
      ? ((input.stepUpVerifiedAt as any).GOSUSLUGI as string)
      : null;

  if (!verifiedAt) return false;
  const ts = new Date(verifiedAt).getTime();
  if (!Number.isFinite(ts)) return false;
  const ageMs = Date.now() - ts;
  return ageMs >= 0 && ageMs <= 15 * 60 * 1000;
}

function requireStepUp(session: Awaited<ReturnType<typeof getServerAuthSession>>) {
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasFreshGosuslugiStepUp(session.user)) {
    return NextResponse.json(
      { error: "Требуется подтверждение через Госуслуги", code: "STEP_UP_REQUIRED", provider: "GOSUSLUGI" },
      { status: 403 }
    );
  }
  return null;
}

export async function GET() {
  try {
    const session = await getServerAuthSession();
    const stepUpError = requireStepUp(session);
    if (stepUpError) return stepUpError;

    const response = await fetchBackendAsUser("/documents/passport/mine", session!.user!.id, { method: "GET" });
    const payload = await response.json().catch(() => ({ error: "Failed to fetch passport" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching passport:", error);
    return NextResponse.json({ error: "Failed to fetch passport" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerAuthSession();
    const stepUpError = requireStepUp(session);
    if (stepUpError) return stepUpError;

    const body = await request.text();
    const response = await fetchBackendAsUser("/documents/passport/mine", session!.user!.id, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body,
    });
    const payload = await response.json().catch(() => ({ error: "Failed to save passport" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error saving passport:", error);
    return NextResponse.json({ error: "Failed to save passport" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerAuthSession();
    const stepUpError = requireStepUp(session);
    if (stepUpError) return stepUpError;

    const response = await fetchBackendAsUser("/documents/passport/mine", session!.user!.id, { method: "DELETE" });
    const payload = await response.json().catch(() => ({ error: "Failed to delete passport" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error deleting passport:", error);
    return NextResponse.json({ error: "Failed to delete passport" }, { status: 500 });
  }
}

