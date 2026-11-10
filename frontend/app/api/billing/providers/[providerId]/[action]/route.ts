import { NextRequest, NextResponse } from "next/server";
import { billingProxy } from "@/shared/api/billing/server";
type Context = { params: Promise<{ providerId: string; action: string }> };
export async function GET(request: NextRequest, { params }: Context) {
  const { providerId, action } = await params;
  if (!["workspace", "slug-change"].includes(action))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return billingProxy(request, providerId, `/${action}`);
}
export async function POST(request: NextRequest, { params }: Context) {
  const { providerId, action } = await params;
  if (!["quote", "settings", "templates", "tasks", "slug-quote", "slug-checkout"].includes(action))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return billingProxy(request, providerId, `/${action}`);
}
