import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/backend-api";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const limit = url.searchParams.get("limit") ?? "10";

    const response = await fetchBackend(`/cities/suggest?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch city suggestions" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching city suggestions:", error);
    return NextResponse.json({ error: "Failed to fetch city suggestions" }, { status: 500 });
  }
}

