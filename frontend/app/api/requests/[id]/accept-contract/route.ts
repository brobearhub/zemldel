import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasFreshGosuslugiStepUp(session.user)) {
      return NextResponse.json(
        {
          error: "Требуется подтверждение через Госуслуги",
          code: "STEP_UP_REQUIRED",
          provider: "GOSUSLUGI",
        },
        { status: 403 }
      );
    }

    const body = await request.text();
    const response = await fetchBackendAsUser(`/requests/mine/${id}/accept-contract`, session.user.id, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const payload = await response.json().catch(() => ({ error: "Failed to accept contract" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error accepting contract:", error);
    return NextResponse.json({ error: "Failed to accept contract" }, { status: 500 });
  }
}
