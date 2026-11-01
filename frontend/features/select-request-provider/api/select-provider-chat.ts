import {
  ensureCustomerRequestConversation,
  fetchCustomerRequestConversations,
  type ChatServiceRequestConversationListItemDto,
} from "@/entities/chat";
import {
  selectCustomerRequestProvider,
  type RequestCustomerDto,
} from "@/entities/request";
import {
  orchestrateProviderSelection,
  recoverSelectedProviderConversation,
  type SelectedProviderChatResult,
} from "../model/select-provider-chat";

type SelectionInput = {
  readonly requestId: string;
  readonly providerId: string;
  readonly providerName: string;
  readonly previousConversations: readonly ChatServiceRequestConversationListItemDto[];
};

const conversationDependencies = {
  listConversations: fetchCustomerRequestConversations,
  ensureConversation: ensureCustomerRequestConversation,
};

export function selectProviderAndPrepareConversation(
  input: SelectionInput & {
    readonly onProviderSelected?: (request: RequestCustomerDto) => void;
  },
): Promise<{
  readonly request: RequestCustomerDto;
  readonly chat: SelectedProviderChatResult;
}> {
  return orchestrateProviderSelection({
    ...input,
    dependencies: {
      ...conversationDependencies,
      selectProvider: selectCustomerRequestProvider,
    },
  });
}

export function retrySelectedProviderConversation(
  input: SelectionInput,
): Promise<SelectedProviderChatResult> {
  return recoverSelectedProviderConversation({
    ...input,
    dependencies: conversationDependencies,
  });
}
