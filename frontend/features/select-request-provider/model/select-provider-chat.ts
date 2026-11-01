import type {
  ChatEnsureResponse,
  ChatServiceRequestConversationListItemDto,
} from "@/entities/chat";

type ConversationDependencies = {
  readonly listConversations: (
    requestId: string,
  ) => Promise<ChatServiceRequestConversationListItemDto[]>;
  readonly ensureConversation: (
    requestId: string,
  ) => Promise<ChatEnsureResponse>;
};

type ReadyChat = {
  readonly kind: "ready";
  readonly selectedConversationId: string;
  readonly conversations: ChatServiceRequestConversationListItemDto[];
};

type RecoveryRequiredChat = {
  readonly kind: "recovery-required";
  readonly providerId: string;
  readonly providerName: string;
  readonly message: string;
};

export type SelectedProviderChatResult = ReadyChat | RecoveryRequiredChat;

const RECOVERY_MESSAGE =
  "Исполнитель выбран, но открыть его чат не удалось. Повторите открытие чата.";

export async function recoverSelectedProviderConversation(input: {
  readonly requestId: string;
  readonly providerId: string;
  readonly providerName: string;
  readonly previousConversations: readonly ChatServiceRequestConversationListItemDto[];
  readonly dependencies: ConversationDependencies;
}): Promise<SelectedProviderChatResult> {
  let conversations: ChatServiceRequestConversationListItemDto[] = [
    ...input.previousConversations,
  ];

  try {
    conversations = await input.dependencies.listConversations(input.requestId);
    const selected = conversations.find(
      (conversation) => conversation.providerId === input.providerId,
    );
    if (selected) {
      return {
        kind: "ready",
        selectedConversationId: selected.conversationId,
        conversations,
      };
    }
  } catch {
    // Ensure может восстановить выбранный тред даже при временной ошибке списка.
  }

  try {
    const ensured = await input.dependencies.ensureConversation(input.requestId);
    const selectedConversation: ChatServiceRequestConversationListItemDto = {
      conversationId: ensured.conversationId,
      providerId: input.providerId,
      providerName: input.providerName,
      lastMessageAt: null,
      lastSnippet: null,
    };
    return {
      kind: "ready",
      selectedConversationId: ensured.conversationId,
      conversations: [
        ...conversations.filter(
          (conversation) =>
            conversation.conversationId !== ensured.conversationId,
        ),
        selectedConversation,
      ],
    };
  } catch {
    return {
      kind: "recovery-required",
      providerId: input.providerId,
      providerName: input.providerName,
      message: RECOVERY_MESSAGE,
    };
  }
}

export async function orchestrateProviderSelection<TRequest>(input: {
  readonly requestId: string;
  readonly providerId: string;
  readonly providerName: string;
  readonly previousConversations: readonly ChatServiceRequestConversationListItemDto[];
  readonly onProviderSelected?: (request: TRequest) => void;
  readonly dependencies: ConversationDependencies & {
    readonly selectProvider: (
      requestId: string,
      providerId: string,
    ) => Promise<TRequest>;
  };
}): Promise<{
  readonly request: TRequest;
  readonly chat: SelectedProviderChatResult;
}> {
  const request = await input.dependencies.selectProvider(
    input.requestId,
    input.providerId,
  );
  input.onProviderSelected?.(request);
  const chat = await recoverSelectedProviderConversation(input);
  return { request, chat };
}
