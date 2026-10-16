import { NextResponse } from "next/server";
import { fetchBackend } from "@/shared/api/backend/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const limit = url.searchParams.get("limit") ?? "10";
    const offset = url.searchParams.get("offset") ?? "0";

    const response = await fetchBackend(
      `/cities/place-suggest?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`,
    );
    const payload = await response.json().catch(() => ({ error: "Failed to fetch place suggestions" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching place suggestions:", error);
    return NextResponse.json({ error: "Failed to fetch place suggestions" }, { status: 500 });
  }
}
