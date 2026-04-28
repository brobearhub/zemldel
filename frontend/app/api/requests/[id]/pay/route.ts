import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetchBackendAsUser(`/requests/mine/${id}/pay`, session.user.id, {
      method: "POST",
    });
    const payload = await response.json().catch(() => ({ error: "Failed to pay" }));
    if (!response.ok) {
      const message =
        payload && typeof payload === "object"
          ? typeof (payload as any).message === "string"
            ? (payload as any).message
            : Array.isArray((payload as any).message)
              ? String((payload as any).message.filter((x: unknown) => typeof x === "string").join(", ") || (payload as any).error || "Failed to pay")
              : typeof (payload as any).error === "string"
                ? (payload as any).error
                : "Failed to pay"
          : "Failed to pay";
      return NextResponse.json({ error: message }, { status: response.status });
    }
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error paying:", error);
    return NextResponse.json({ error: "Failed to pay" }, { status: 500 });
  }
}
