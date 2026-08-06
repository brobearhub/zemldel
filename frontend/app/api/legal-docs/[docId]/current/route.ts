import { NextResponse } from "next/server";
import { fetchBackend } from "@/shared/api/backend/server";

const ALLOWED = new Set(["terms", "privacy", "consent", "offer"]);

type RouteContext = {
  params: Promise<{ docId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { docId: raw } = await context.params;
    const docId = raw.trim().toLowerCase();
    if (!ALLOWED.has(docId)) {
      return NextResponse.json({ error: "Unknown legal doc" }, { status: 400 });
    }

    const response = await fetchBackend(`/legal-docs/${docId}/current`);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch legal doc" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching legal doc:", error);
    return NextResponse.json({ error: "Failed to fetch legal doc" }, { status: 500 });
  }
}
