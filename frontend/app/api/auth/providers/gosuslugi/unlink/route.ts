import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

export async function POST() {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetchBackendAsUser("/auth/providers/gosuslugi/unlink", session.user.id, {
      method: "POST",
    });

    const payload = await response.json().catch(() => ({ error: "Failed to unlink Gosuslugi" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error unlinking Gosuslugi:", error);
    return NextResponse.json({ error: "Failed to unlink Gosuslugi" }, { status: 500 });
  }
}

