import { NextResponse } from "next/server";
import { fetchBackend } from "@/shared/api/backend/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cursor = new URL(request.url).searchParams.get("cursor");
    const qs = cursor ? `?limit=20&cursor=${encodeURIComponent(cursor)}` : "?limit=20";
    const response = await fetchBackend(`/services/${id}/reviews${qs}`);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch reviews" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching service reviews:", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}
