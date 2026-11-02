import type { ChatServiceRequestConversationListItemDto } from "@/entities/chat/dto/chat.dto";
import type { RequestSubjectType } from "@/entities/request";

type ActiveConversationInput = {
  readonly conversations: readonly ChatServiceRequestConversationListItemDto[];
  readonly currentConversationId: string | null;
  readonly lockedAt: string | null;
  readonly selectedProviderId: string | null;
  readonly preferSelectedProvider?: boolean;
};

export function resolveActiveConversationId({
  conversations,
  currentConversationId,
  lockedAt,
  selectedProviderId,
  preferSelectedProvider = true,
}: ActiveConversationInput): string | null {
  if (
    !preferSelectedProvider &&
    currentConversationId &&
    conversations.some((c) => c.conversationId === currentConversationId)
  ) {
    return currentConversationId;
  }
  if (lockedAt) {
    if (!selectedProviderId) return null;
    return (
      conversations.find(
        (conversation) => conversation.providerId === selectedProviderId,
      )?.conversationId ?? null
    );
  }

  if (
    currentConversationId &&
    conversations.some(
      (conversation) => conversation.conversationId === currentConversationId,
    )
  ) {
    return currentConversationId;
  }

  return conversations[0]?.conversationId ?? null;
}

export function resolveSelectionAfterProviderSelect(input: {
  readonly previousConversationId: string | null;
  readonly selectedProviderId: string;
  readonly conversations: readonly ChatServiceRequestConversationListItemDto[];
  readonly succeeded: boolean;
}): string | null {
  if (!input.succeeded) return input.previousConversationId;
  return (
    input.conversations.find(
      (conversation) => conversation.providerId === input.selectedProviderId,
    )?.conversationId ?? null
  );
}

export function resolveProviderSelectionVisibility(input: {
  readonly subjectType: RequestSubjectType;
  readonly lockedAt: string | null;
}): boolean {
  return input.subjectType !== "SERVICE" && !input.lockedAt;
}
