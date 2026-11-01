import type { RequestProDto } from "@/entities/request";

type ErrorPayload = { error?: unknown; message?: unknown };

function errorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as ErrorPayload;
  if (typeof body.message === "string" && body.message.trim())
    return body.message;
  if (typeof body.error === "string" && body.error.trim()) return body.error;
  return null;
}

export async function submitProRequestDelivery(
  requestId: string,
  summary: string,
): Promise<RequestProDto> {
  const response = await fetch(`/api/pro/requests/${requestId}/mark-rendered`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ summary }),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      errorMessage(payload) ?? "Не удалось передать работу на принятие",
    );
  }
  return payload as RequestProDto;
}
