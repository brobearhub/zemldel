import { NextResponse } from "next/server";
import { fetchBackend } from "@/shared/api/backend/server";

export async function GET() {
  try {
    const response = await fetchBackend("/service-categories");
    const payload = await response.json().catch(() => ({ error: "Failed to fetch categories" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching service categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

