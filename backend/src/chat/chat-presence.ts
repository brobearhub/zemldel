export type ChatViewerSide = 'customer' | 'provider';

export type ChatPresenceUpdatedPayload = {
  conversationId: string;
  customerOnline: boolean;
  providerOnline: boolean;
};

export function pickPeerOnline(
  viewerSide: ChatViewerSide,
  payload: ChatPresenceUpdatedPayload,
): boolean {
  return viewerSide === 'customer' ? payload.providerOnline : payload.customerOnline;
}

