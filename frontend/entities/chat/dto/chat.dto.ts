export type ChatMessageRepliedToDto = {
  id: string;
  senderUserId: string;
  senderName: string | null;
  bodySnippet: string;
};

export type ChatMessageDto = {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderName: string | null;
  body: string;
  clientMessageId: string;
  createdAt: string;
  repliedTo?: ChatMessageRepliedToDto;
};

export type ChatUnreadHintPayload = {
  conversationId: string;
  subjectType: "request";
  subjectId: string;
  serviceRequestId?: string;
  lastMessageAt: string;
  senderUserId: string;
  bodySnippet?: string;
};

export type ChatEnsureResponse = {
  conversationId: string;
  messages: ChatMessageDto[];
};

export type ChatConversationAccessDto = {
  canRead: true;
  canWrite: boolean;
  reason?: string;
};

export type ChatServiceRequestConversationListItemDto = {
  conversationId: string;
  providerId: string;
  providerName: string;
  lastMessageAt: string | null;
  lastSnippet: string | null;
};

export type ChatInboxItemDto = {
  serviceRequestId: string;
  title: string;
  lastMessageAt: string | null;
  lastSnippet: string | null;
  unreadCount?: number;
};

export type ChatPostMessageResponse = {
  message: ChatMessageDto;
  alreadyExisted: boolean;
};

export type ChatViewerSide = "customer" | "provider";

export type ChatPresenceUpdatedPayload = {
  conversationId: string;
  customerOnline: boolean;
  providerOnline: boolean;
};

export type ChatJoinConversationAck =
  | { ok: true; viewerSide: ChatViewerSide; peerOnline: boolean }
  | { ok: false; error: string };
