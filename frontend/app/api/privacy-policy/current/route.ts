import { NextResponse } from "next/server";
import { fetchBackend } from "@/shared/api/backend/server";

/** @deprecated use /api/legal-docs/privacy/current */
export async function GET() {
  try {
    const response = await fetchBackend("/legal-docs/privacy/current");
    const payload = (await response.json().catch(() => null)) as
      | { version?: string; markdown?: string; error?: string }
      | null;
    if (!response.ok) {
      return NextResponse.json(
        { error: payload?.error ?? "Failed to fetch privacy policy" },
        { status: response.status },
      );
    }
    return NextResponse.json(
      { version: payload?.version, markdown: payload?.markdown },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching privacy policy:", error);
    return NextResponse.json({ error: "Failed to fetch privacy policy" }, { status: 500 });
  }
}
