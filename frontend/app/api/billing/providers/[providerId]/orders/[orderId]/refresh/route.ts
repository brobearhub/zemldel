import { NextRequest, NextResponse } from "next/server";
import { billingProxy } from "@/shared/api/billing/server";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string; orderId: string }> },
) {
  const { providerId, orderId } = await params;
  if (!/^[a-f\d-]{36}$/i.test(orderId))
    return NextResponse.json({ error: "Некорректный платёж" }, { status: 400 });
  return billingProxy(request, providerId, `/orders/${orderId}/refresh`);
}
