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

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!hasFreshGosuslugiStepUp(session.user)) {
      return NextResponse.json(
        { error: "Требуется подтверждение через Госуслуги", code: "STEP_UP_REQUIRED", provider: "GOSUSLUGI" },
        { status: 403 }
      );
    }

    const response = await fetchBackendAsUser(`/contracts/instances/${id}/sign`, session.user.id, { method: "POST" });
    const payload = await response.json().catch(() => ({ error: "Failed to sign contract" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error signing contract (customer):", error);
    return NextResponse.json({ error: "Failed to sign contract" }, { status: 500 });
  }
}

