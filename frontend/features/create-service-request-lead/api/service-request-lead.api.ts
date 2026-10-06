"use client";

import type { RequestCustomerDto } from "@/entities/request";
import type { ChatEnsureResponse, ChatPostMessageResponse } from "@/entities/chat/dto/chat.dto";

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

type CreateServiceRequestInput = {
  serviceId: string;
  message: string;
  cadastralNumbers: string[];
};

export async function createServiceRequest(input: CreateServiceRequestInput): Promise<RequestCustomerDto> {
  const res = await fetch(`/api/services/${encodeURIComponent(input.serviceId)}/requests`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: input.message, cadastralNumbers: input.cadastralNumbers }),
  });

  const payload = (await res.json().catch(() => null)) as RequestCustomerDto | { error?: string } | null;
  if (!res.ok || !payload || typeof payload !== "object" || ("error" in payload && payload.error)) {
    const errorMessage =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Не удалось создать заявку";
    throw new Error(errorMessage);
  }

  return payload as RequestCustomerDto;
}

export async function ensureRequestConversation(input: { serviceRequestId: string }): Promise<ChatEnsureResponse> {
  const res = await fetch("/api/chat/ensure", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ serviceRequestId: input.serviceRequestId }),
  });

  const payload = (await res.json().catch(() => null)) as ChatEnsureResponse | { error?: string } | null;
  if (!res.ok) {
    const errorMessage =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Чат недоступен";
    throw new Error(errorMessage);
  }

  if (!payload || typeof payload !== "object" || !("conversationId" in payload) || typeof (payload as any).conversationId !== "string") {
    throw new Error("Чат недоступен");
  }

  return payload as ChatEnsureResponse;
}

export async function postConversationMessage(input: {
  conversationId: string;
  body: string;
  clientMessageId: string;
}): Promise<ChatPostMessageResponse> {
  const res = await fetch(`/api/chat/conversations/${encodeURIComponent(input.conversationId)}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      body: input.body,
      clientMessageId: input.clientMessageId,
    }),
  });

  const payload = (await res.json().catch(() => null)) as ChatPostMessageResponse | { error?: string } | null;
  if (!res.ok) {
    const errorMessage =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Не удалось отправить сообщение";
    throw new Error(errorMessage);
  }

  if (!payload || typeof payload !== "object" || !("message" in payload)) {
    throw new Error("Не удалось отправить сообщение");
  }

  return payload as ChatPostMessageResponse;
}

