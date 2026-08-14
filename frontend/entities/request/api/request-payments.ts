import type { RequestPaymentItemDto } from "@/entities/request";

export type RequestFinanceDto = {
  totalAmountKopecks: number | null;
  paidAmountKopecks: number;
  remainingAmountKopecks: number | null;
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

export async function setProRequestTotal(requestId: string, totalAmountKopecks: number): Promise<RequestFinanceDto> {
  const res = await fetch(`/api/pro/requests/${requestId}/finance`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ totalAmountKopecks }),
  });
  return parseJson<RequestFinanceDto>(res, "Не удалось сохранить цену");
}

export async function addProRequestPayment(
  requestId: string,
  input: { amountKopecks: number; comment: string; type?: "CONTRACT" | "OTHER" },
): Promise<RequestFinanceDto> {
  const res = await fetch(`/api/pro/requests/${requestId}/payments`, {
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

export async function fetchCustomerRequestFinance(requestId: string): Promise<RequestFinanceDto> {
  const res = await fetch(`/api/requests/${requestId}/payments`, { cache: "no-store" });
  return parseJson<RequestFinanceDto>(res, "Не удалось загрузить оплату");
}

export async function markCustomerRequestPaymentPaid(requestId: string, paymentId: string): Promise<RequestFinanceDto> {
  const res = await fetch(`/api/requests/${requestId}/payments/${paymentId}/paid`, { method: "POST" });
  return parseJson<RequestFinanceDto>(res, "Не удалось отметить платёж как оплаченный");
}
