import type { RequestRemarkDto } from "@/entities/request";

async function parseJson<T>(res: Response, fallbackMessage: string): Promise<T> {
  const payload = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const msg =
      payload && typeof payload === "object" && payload && "error" in payload && typeof (payload as any).error === "string"
        ? ((payload as any).error as string)
        : fallbackMessage;
    throw new Error(msg);
  }
  return payload as T;
}

export async function fetchCustomerRequestRemarks(requestId: string): Promise<RequestRemarkDto[]> {
  const res = await fetch(`/api/requests/${requestId}/remarks`, { cache: "no-store" });
  return await parseJson<RequestRemarkDto[]>(res, "Не удалось загрузить замечания");
}

export async function createCustomerRequestRemark(requestId: string, text: string): Promise<RequestRemarkDto> {
  const res = await fetch(`/api/requests/${requestId}/remarks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return await parseJson<RequestRemarkDto>(res, "Не удалось добавить замечание");
}

export async function completeCustomerRequestRemark(requestId: string, remarkId: string): Promise<RequestRemarkDto> {
  const res = await fetch(`/api/requests/${requestId}/remarks/${remarkId}/complete`, { method: "POST" });
  return await parseJson<RequestRemarkDto>(res, "Не удалось отметить замечание выполненным");
}

export async function fetchProRequestRemarks(requestId: string): Promise<RequestRemarkDto[]> {
  const res = await fetch(`/api/pro/requests/${requestId}/remarks`, { cache: "no-store" });
  return await parseJson<RequestRemarkDto[]>(res, "Не удалось загрузить замечания");
}

export async function createProRequestRemark(requestId: string, text: string): Promise<RequestRemarkDto> {
  const res = await fetch(`/api/pro/requests/${requestId}/remarks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return await parseJson<RequestRemarkDto>(res, "Не удалось добавить замечание");
}

export async function completeProRequestRemark(requestId: string, remarkId: string): Promise<RequestRemarkDto> {
  const res = await fetch(`/api/pro/requests/${requestId}/remarks/${remarkId}/complete`, { method: "POST" });
  return await parseJson<RequestRemarkDto>(res, "Не удалось отметить замечание выполненным");
}

