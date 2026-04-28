import { NextResponse } from "next/server";
import { fetchBackendAsUser, fetchBackend } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

type PaymentDto = {
  id: string;
  externalId?: string | null;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  providerKey: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.TEST_PAYMENT_WEBHOOK_SECRET;
  if (!secret) {
    console.error("TEST_PAYMENT_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Mock confirm is disabled" }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as {
    outcome?: unknown;
  } | null;
  const outcome = body?.outcome;
  if (outcome !== "SUCCEEDED" && outcome !== "CANCELLED" && outcome !== "FAILED") {
    return NextResponse.json(
      { error: "outcome must be SUCCEEDED, FAILED or CANCELLED" },
      { status: 400 },
    );
  }

  const paymentResp = await fetchBackendAsUser(`/payments/${id}`, session.user.id);
  if (!paymentResp.ok) {
    const err = await paymentResp.json().catch(() => ({ error: "Failed to load payment" }));
    return NextResponse.json(err, { status: paymentResp.status });
  }
  const payment = (await paymentResp.json()) as PaymentDto;

  if (payment.providerKey !== "test") {
    return NextResponse.json(
      { error: "Mock confirm is only available for test provider" },
      { status: 400 },
    );
  }

  const webhookResp = await fetchBackend(`/payments/webhook/${payment.providerKey}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-test-webhook-secret": secret,
    },
    body: JSON.stringify({ externalId: payment.externalId, outcome }),
  });

  const webhookPayload = await webhookResp.json().catch(() => ({ error: "Webhook failed" }));
  return NextResponse.json(webhookPayload, { status: webhookResp.status });
}
