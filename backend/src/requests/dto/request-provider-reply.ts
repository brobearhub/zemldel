const PROVIDER_REPLY_PREVIEW_MAX = 300;

export type ProviderReplyCandidate = {
  body: string;
  createdAt: Date;
  senderUserId: string;
  requestId: string;
  conversationId: string;
  customerUserId: string;
  conversationProviderId: string;
  requestProviderId: string | null;
};

export type ProviderReplyPreview = {
  body: string;
  customerBody: string | null;
  awaitingProviderReply: boolean;
};

/** Одна строка для карточки: пробелы схлопнуты, длина ограничена. */
export function formatProviderReplyPreview(body: string): string | null {
  const singleLine = body.replace(/\s+/g, ' ').trim();
  if (!singleLine) return null;
  return singleLine.length <= PROVIDER_REPLY_PREVIEW_MAX
    ? singleLine
    : singleLine.slice(0, PROVIDER_REPLY_PREVIEW_MAX);
}

function isProviderReply(message: ProviderReplyCandidate): boolean {
  if (message.senderUserId === message.customerUserId) return false;
  if (
    message.requestProviderId != null &&
    message.conversationProviderId !== message.requestProviderId
  ) {
    return false;
  }
  return true;
}

/**
 * Последняя реплика исполнителя на заявку.
 * Why: карточка «Обсуждение» показывает ответ исполнителя, а не последнее сообщение чата.
 * Свои реплики заказчика и диалоги других исполнителей в выборку не входят.
 */
export function pickLatestProviderMessage(
  messages: readonly ProviderReplyCandidate[],
): Map<string, ProviderReplyPreview> {
  const latest = new Map<
    string,
    { at: number; body: string; conversationId: string }
  >();

  for (const message of messages) {
    if (!isProviderReply(message)) continue;
    const body = formatProviderReplyPreview(message.body);
    if (!body) continue;
    const at = message.createdAt.getTime();
    if (Number.isNaN(at)) continue;
    const current = latest.get(message.requestId);
    if (!current || at > current.at) {
      latest.set(message.requestId, {
        at,
        body,
        conversationId: message.conversationId,
      });
    }
  }

  const awaiting = new Set<string>();
  // Why: вопрос заказчика берём из того же диалога, что и ответ исполнителя.
  const customerLatest = new Map<string, { at: number; body: string }>();
  for (const message of messages) {
    if (message.senderUserId !== message.customerUserId) continue;
    const current = latest.get(message.requestId);
    if (!current || message.conversationId !== current.conversationId) continue;
    const at = message.createdAt.getTime();
    if (Number.isNaN(at)) continue;
    if (at > current.at) awaiting.add(message.requestId);
    const body = formatProviderReplyPreview(message.body);
    if (!body) continue;
    const existing = customerLatest.get(message.requestId);
    if (!existing || at > existing.at) {
      customerLatest.set(message.requestId, { at, body });
    }
  }

  return new Map(
    [...latest].map(([requestId, value]) => [
      requestId,
      {
        body: value.body,
        customerBody: customerLatest.get(requestId)?.body ?? null,
        awaitingProviderReply: awaiting.has(requestId),
      },
    ]),
  );
}

export type CustomerReplyCandidate = {
  body: string;
  createdAt: Date;
  senderUserId: string;
  requestId: string;
  conversationId: string;
  customerUserId: string;
  conversationProviderId: string;
  actorProviderId: string;
};

export type CustomerReplyPreview = {
  body: string | null;
  providerBody: string | null;
  awaitingCustomerReply: boolean;
  lastMessageAt: Date;
};

function isOwnConversation(message: CustomerReplyCandidate): boolean {
  return message.conversationProviderId === message.actorProviderId;
}

/**
 * Последняя реплика заказчика в диалоге этого исполнителя.
 * Why: лента «Обсуждение» показывает ответ заказчика, а не сообщение другого исполнителя.
 */
export function pickLatestCustomerMessage(
  messages: readonly CustomerReplyCandidate[],
): Map<string, CustomerReplyPreview> {
  const latest = new Map<
    string,
    { at: number; body: string; conversationId: string }
  >();

  for (const message of messages) {
    if (!isOwnConversation(message)) continue;
    if (message.senderUserId !== message.customerUserId) continue;
    const body = formatProviderReplyPreview(message.body);
    if (!body) continue;
    const at = message.createdAt.getTime();
    if (Number.isNaN(at)) continue;
    const current = latest.get(message.requestId);
    if (!current || at > current.at) {
      latest.set(message.requestId, {
        at,
        body,
        conversationId: message.conversationId,
      });
    }
  }

  const awaiting = new Set<string>();
  const lastMessageAt = new Map<string, number>();
  // Why: лента показывает последний ответ исполнителя рядом с вопросом заказчика.
  const latestProvider = new Map<string, { at: number; body: string }>();
  for (const message of messages) {
    if (!isOwnConversation(message)) continue;
    const at = message.createdAt.getTime();
    if (Number.isNaN(at)) continue;
    const currentAt = lastMessageAt.get(message.requestId);
    if (currentAt == null || at > currentAt) {
      lastMessageAt.set(message.requestId, at);
    }
    if (message.senderUserId === message.customerUserId) continue;
    const body = formatProviderReplyPreview(message.body);
    if (body) {
      const existing = latestProvider.get(message.requestId);
      if (!existing || at > existing.at) {
        latestProvider.set(message.requestId, { at, body });
      }
    }
    const current = latest.get(message.requestId);
    if (!current || message.conversationId !== current.conversationId) continue;
    if (at > current.at) awaiting.add(message.requestId);
  }

  return new Map(
    [...lastMessageAt].map(([requestId, at]) => {
      const customer = latest.get(requestId);
      return [
        requestId,
        {
          body: customer?.body ?? null,
          providerBody: latestProvider.get(requestId)?.body ?? null,
          awaitingCustomerReply: awaiting.has(requestId),
          lastMessageAt: new Date(at),
        },
      ];
    }),
  );
}
