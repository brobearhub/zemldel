import { fetchIdempotentWrite } from "@/shared/api/idempotent-write";
import type { RequestPaymentItemDto, RequestPriceProposalDto } from "@/entities/request";

export type RequestFinanceDto = {
  totalAmountRubles: number | null;
  priceProposal: RequestPriceProposalDto | null;
  canProposePrice: boolean;
  canAcceptPrice: boolean;
  paidAmountRubles: number;
  remainingAmountRubles: number | null;
  payments: RequestPaymentItemDto[];
};

async function parseJson<T>(res: Response, fallbackMessage: string): Promise<T> {
  const payload = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : fallbackMessage;
    throw new Error(message);
  }
  return payload as T;
}

export async function fetchProRequestFinance(requestId: string): Promise<RequestFinanceDto> {
  const res = await fetch(`/api/pro/requests/${requestId}/payments`, { cache: "no-store" });
  return parseJson<RequestFinanceDto>(res, "Не удалось загрузить оплату");
}

export async function proposeProRequestPrice(requestId: string, amountRubles: number): Promise<RequestFinanceDto> {
  const res = await fetch(`/api/pro/requests/${requestId}/price-proposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amountRubles }),
  });
  return parseJson<RequestFinanceDto>(res, "Не удалось предложить цену");
}

export async function acceptProRequestPrice(requestId: string, proposalId: string): Promise<RequestFinanceDto> {
  const res = await fetch(`/api/pro/requests/${requestId}/price-proposals/${proposalId}/accept`, { method: "POST" });
  return parseJson<RequestFinanceDto>(res, "Не удалось принять цену");
}

export async function addProRequestPayment(
  requestId: string,
  input: { amountRubles: number; comment: string; type?: "CONTRACT" | "OTHER" },
): Promise<RequestFinanceDto> {
  const res = await fetchIdempotentWrite(`/api/pro/requests/${requestId}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<RequestFinanceDto>(res, "Не удалось добавить поступление");
}

export async function markProRequestPaymentPaid(requestId: string, paymentId: string): Promise<RequestFinanceDto> {
  const res = await fetch(`/api/pro/requests/${requestId}/payments/${paymentId}/paid`, { method: "POST" });
  return parseJson<RequestFinanceDto>(res, "Не удалось отметить платёж как оплаченный");
}

function financeContextQuery(conversationId?: string): string {
  return conversationId
    ? `?conversationId=${encodeURIComponent(conversationId)}`
    : "";
}

export async function fetchCustomerRequestFinance(
  requestId: string,
  conversationId?: string,
  signal?: AbortSignal,
): Promise<RequestFinanceDto> {
  const res = await fetch(
    `/api/requests/${requestId}/payments${financeContextQuery(conversationId)}`,
    { cache: "no-store", signal },
  );
  return parseJson<RequestFinanceDto>(res, "Не удалось загрузить оплату");
}

export async function proposeCustomerRequestPrice(requestId: string, amountRubles: number, conversationId?: string): Promise<RequestFinanceDto> {
  const res = await fetch(`/api/requests/${requestId}/price-proposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amountRubles, conversationId }),
  });
  return parseJson<RequestFinanceDto>(res, "Не удалось предложить цену");
}

export async function acceptCustomerRequestPrice(requestId: string, proposalId: string, conversationId?: string): Promise<RequestFinanceDto> {
  const res = await fetch(`/api/requests/${requestId}/price-proposals/${proposalId}/accept${financeContextQuery(conversationId)}`, { method: "POST" });
  return parseJson<RequestFinanceDto>(res, "Не удалось принять цену");
}

export async function addCustomerRequestPayment(
  requestId: string,
  input: { amountRubles: number; comment: string; type?: "CONTRACT" | "OTHER" },
  conversationId?: string,
): Promise<RequestFinanceDto> {
  const res = await fetchIdempotentWrite(`/api/requests/${requestId}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, conversationId }),
  });
  return parseJson<RequestFinanceDto>(res, "Не удалось добавить отметку");
}

export async function markCustomerRequestPaymentPaid(requestId: string, paymentId: string, conversationId?: string): Promise<RequestFinanceDto> {
  const res = await fetch(`/api/requests/${requestId}/payments/${paymentId}/paid${financeContextQuery(conversationId)}`, { method: "POST" });
  return parseJson<RequestFinanceDto>(res, "Не удалось отметить платёж как оплаченный");
}
