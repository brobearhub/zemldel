import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/shared/api/backend/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const response = await fetchBackend(`/services/${id}`);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch service" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching service:", error);
    return NextResponse.json(
      { error: "Failed to fetch service" },
      { status: 500 }
    );
  }
}
