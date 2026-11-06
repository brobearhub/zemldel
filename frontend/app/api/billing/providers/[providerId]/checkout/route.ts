import { NextRequest } from "next/server";
import { billingProxy } from "@/shared/api/billing/server";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> },
) {
  return billingProxy(request, (await params).providerId, "/checkout");
}
