import { NextResponse } from "next/server";
import { fetchBackend } from "@/shared/api/backend/server";

export async function GET() {
  try {
    const response = await fetchBackend("/services");
    const payload = await response.json().catch(() => ({ error: "Failed to fetch services" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}
