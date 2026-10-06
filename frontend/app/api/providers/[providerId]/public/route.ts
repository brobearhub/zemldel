import { NextResponse } from "next/server";
import { fetchBackend } from "@/shared/api/backend/server";

type Params = { params: Promise<{ providerId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { providerId } = await params;
    const response = await fetchBackend(`/providers/${providerId}/public`);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch provider public profile" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching provider public profile:", error);
    return NextResponse.json({ error: "Failed to fetch provider public profile" }, { status: 500 });
  }
}

