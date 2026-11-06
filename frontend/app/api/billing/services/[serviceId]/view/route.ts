import { NextRequest } from "next/server";
import { fetchBackend } from "@/shared/api/backend/server";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  const { serviceId } = await params;
  if (!/^[a-f\d-]{36}$/i.test(serviceId))
    return new Response(null, { status: 400 });
  try {
    const response = await fetchBackend(`/billing/services/${serviceId}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await request.json()),
    });
    return new Response(null, { status: response.ok ? 204 : response.status });
  } catch {
    return new Response(null, { status: 503 });
  }
}
