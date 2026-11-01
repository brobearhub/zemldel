import type { RequestCustomerDto } from "@/entities/request/dto/request.dto";

type Fetcher = typeof fetch;

export async function selectCustomerRequestProvider(
  requestId: string,
  providerId: string,
  fetcher: Fetcher = fetch,
): Promise<RequestCustomerDto> {
  const response = await fetcher(`/api/requests/${requestId}/select-provider`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ providerId }),
  });
  const payload = (await response.json().catch(() => null)) as
    | RequestCustomerDto
    | { error?: string }
    | null;
  if (
    !response.ok ||
    !payload ||
    typeof payload !== "object" ||
    !("id" in payload) ||
    typeof payload.id !== "string"
  ) {
    throw new Error(
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Не удалось выбрать исполнителя",
    );
  }
  return payload as RequestCustomerDto;
}

export async function deleteCustomerRequest(requestId: string): Promise<{ ok: true }> {
  const res = await fetch(`/api/requests/${requestId}`, {
    method: "DELETE",
  });
  const payload = (await res.json().catch(() => null)) as { ok?: true; error?: string } | null;
  if (!res.ok) {
    throw new Error(
      payload && typeof payload === "object" && payload.error
        ? payload.error
        : "Не удалось удалить заявку",
    );
  }
  if (!payload || payload.ok !== true) {
    throw new Error("Не удалось удалить заявку");
  }
  return { ok: true };
}
