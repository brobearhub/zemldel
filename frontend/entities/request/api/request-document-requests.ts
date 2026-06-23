import type { RequestDocumentRequestDto } from "@/entities/request";

async function safeJson(res: Response) {
  return (await res.json().catch(() => null)) as unknown;
}

function extractError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const value = (payload as any).error;
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return fallback;
}

export async function fetchProRequestDocumentRequests(requestId: string): Promise<RequestDocumentRequestDto[]> {
  const res = await fetch(`/api/pro/requests/${requestId}/document-requests`, { cache: "no-store" });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось загрузить список документов"));
  return Array.isArray(payload) ? (payload as RequestDocumentRequestDto[]) : [];
}

export async function createProRequestDocumentRequest(requestId: string, title: string): Promise<RequestDocumentRequestDto> {
  const res = await fetch(`/api/pro/requests/${requestId}/document-requests`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title }),
  });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось запросить документ"));
  return payload as RequestDocumentRequestDto;
}

export async function deleteProRequestDocumentRequest(
  requestId: string,
  docRequestId: string
): Promise<{ ok: true }> {
  const res = await fetch(`/api/pro/requests/${requestId}/document-requests/${docRequestId}`, { method: "DELETE" });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось отменить запрос документа"));
  return { ok: true };
}

export async function fetchCustomerRequestDocumentRequests(requestId: string): Promise<RequestDocumentRequestDto[]> {
  const res = await fetch(`/api/requests/${requestId}/document-requests`, { cache: "no-store" });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось загрузить список документов"));
  return Array.isArray(payload) ? (payload as RequestDocumentRequestDto[]) : [];
}

export async function uploadCustomerRequestDocument(
  requestId: string,
  docRequestId: string,
  file: File
): Promise<{ ok: true }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`/api/requests/${requestId}/document-requests/${docRequestId}/upload`, {
    method: "POST",
    body: form,
  });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось загрузить документ"));
  return { ok: true };
}

export async function deleteCustomerRequestDocumentFile(
  requestId: string,
  docRequestId: string
): Promise<{ ok: true }> {
  const res = await fetch(`/api/requests/${requestId}/document-requests/${docRequestId}/file`, { method: "DELETE" });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось удалить документ"));
  return { ok: true };
}

