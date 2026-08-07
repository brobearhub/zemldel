export type CabinetZone = "profile" | "pro" | "chats" | null;

export function getCabinetZone(pathname: string): CabinetZone {
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return "profile";
  if (pathname === "/pro" || pathname.startsWith("/pro/")) return "pro";
  if (pathname === "/chats" || pathname.startsWith("/chats/")) return "chats";
  return null;
}

