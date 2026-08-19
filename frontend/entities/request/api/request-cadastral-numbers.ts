import type { RequestCustomerDto, RequestProDto } from "@/entities/request";

async function parseJson<T>(res: Response, fallbackMessage: string): Promise<T> {
  const payload = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const msg =
      payload && typeof payload === "object" && payload && "error" in payload && typeof (payload as { error?: unknown }).error === "string"
        ? ((payload as { error: string }).error)
        : fallbackMessage;
    throw new Error(msg);
  }
  return payload as T;
}

export async function appendCustomerCadastralNumber(
  requestId: string,
  value: string,
): Promise<RequestCustomerDto> {
  const res = await fetch(`/api/requests/${requestId}/cadastral-numbers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  return await parseJson<RequestCustomerDto>(res, "Не удалось добавить кадастровый номер");
}

export async function updateCustomerCadastralNumber(
  requestId: string,
  index: number,
  value: string,
): Promise<RequestCustomerDto> {
  const res = await fetch(`/api/requests/${requestId}/cadastral-numbers/${index}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  return await parseJson<RequestCustomerDto>(res, "Не удалось изменить кадастровый номер");
}

export async function deleteCustomerCadastralNumber(
  requestId: string,
  index: number,
): Promise<RequestCustomerDto> {
  const res = await fetch(`/api/requests/${requestId}/cadastral-numbers/${index}`, {
    method: "DELETE",
  });
  return await parseJson<RequestCustomerDto>(res, "Не удалось удалить кадастровый номер");
}

export async function appendProCadastralNumber(
  requestId: string,
  value: string,
): Promise<RequestProDto> {
  const res = await fetch(`/api/pro/requests/${requestId}/cadastral-numbers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  return await parseJson<RequestProDto>(res, "Не удалось добавить кадастровый номер");
}

export async function updateProCadastralNumber(
  requestId: string,
  index: number,
  value: string,
): Promise<RequestProDto> {
  const res = await fetch(`/api/pro/requests/${requestId}/cadastral-numbers/${index}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  return await parseJson<RequestProDto>(res, "Не удалось изменить кадастровый номер");
}

export async function deleteProCadastralNumber(
  requestId: string,
  index: number,
): Promise<RequestProDto> {
  const res = await fetch(`/api/pro/requests/${requestId}/cadastral-numbers/${index}`, {
    method: "DELETE",
  });
  return await parseJson<RequestProDto>(res, "Не удалось удалить кадастровый номер");
}
