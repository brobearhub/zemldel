export type CabinetZone = "profile" | "pro" | null;

export function getCabinetZone(pathname: string): CabinetZone {
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return "profile";
  if (pathname.startsWith("/pro/")) return "pro";
  return null;
}

