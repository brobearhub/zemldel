"use client";

type PostLeadInput = {
  serviceId: string;
  customerEmail: string;
};

function normalizeNullableString(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function postServiceRequestLead(input: PostLeadInput): Promise<void> {
  const res = await fetch(`/api/services/${encodeURIComponent(input.serviceId)}/requests`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      customerName: null,
      customerEmail: normalizeNullableString(input.customerEmail),
      customerPhone: null,
      message: null,
      requestCityId: null,
    }),
  });

  const payload = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) {
    throw new Error(payload?.error ?? "Не удалось отправить заявку");
  }
}

