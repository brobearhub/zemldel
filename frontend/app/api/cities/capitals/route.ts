import { NextResponse } from "next/server";
import { fetchBackend } from "@/shared/api/backend/server";

export async function GET() {
  try {
    const response = await fetchBackend("/cities/capitals");
    const payload = await response.json().catch(() => ({ error: "Failed to fetch regional capitals" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching regional capitals:", error);
    return NextResponse.json({ error: "Failed to fetch regional capitals" }, { status: 500 });
  }
}
