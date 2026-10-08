import { NextResponse } from "next/server";
import { fetchBackend } from "@/shared/api/backend/server";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const response = await fetchBackend(`/providers/by-slug/${encodeURIComponent(slug)}`);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch provider" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching provider by slug:", error);
    return NextResponse.json({ error: "Failed to fetch provider" }, { status: 500 });
  }
}
