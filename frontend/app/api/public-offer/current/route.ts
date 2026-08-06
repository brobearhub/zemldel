import { NextResponse } from "next/server";
import { fetchBackend } from "@/shared/api/backend/server";

/** @deprecated use /api/legal-docs/offer/current */
export async function GET() {
  try {
    const response = await fetchBackend("/legal-docs/offer/current");
    const payload = (await response.json().catch(() => null)) as
      | { version?: string; markdown?: string; error?: string }
      | null;
    if (!response.ok) {
      return NextResponse.json(
        { error: payload?.error ?? "Failed to fetch public offer" },
        { status: response.status },
      );
    }
    return NextResponse.json(
      { version: payload?.version, markdown: payload?.markdown },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching public offer:", error);
    return NextResponse.json({ error: "Failed to fetch public offer" }, { status: 500 });
  }
}
