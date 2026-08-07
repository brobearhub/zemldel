import type { ChatPresenceUpdatedPayload, ChatViewerSide } from "../dto/chat.dto";

export function pickPeerOnline(viewerSide: ChatViewerSide, payload: ChatPresenceUpdatedPayload): boolean {
  return viewerSide === "customer" ? payload.providerOnline : payload.customerOnline;
}

