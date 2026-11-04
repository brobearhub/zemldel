export type MessengerPlatform = "TELEGRAM" | "MAX";
export type MessengerStatus = {
  platform: MessengerPlatform;
  configured: boolean;
  connected: boolean;
  displayName: string | null;
  notificationsEnabled: boolean;
  blocked: boolean;
  pending: { id: string; displayName: string | null; expiresAt: string } | null;
};
export type MessengerLink = { url: string; expiresAt: string };
