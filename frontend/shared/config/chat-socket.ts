/**
 * Browser URL for Socket.io (Nest). When unset, same-origin is used (requires reverse-proxy in prod).
 * Local dev: set `NEXT_PUBLIC_CHAT_SOCKET_URL=http://localhost:3003` so the client reaches Nest.
 */
export function getChatSocketUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

