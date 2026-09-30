export const GUEST_CITY_STORAGE_KEY = "zemledel:selected-city:v1" as const;

export type GuestStoredCity = {
  id: string;
  name: string;
  regionCode: string;
  regionName: string;
};

const GUEST_CITY_CHANGE_EVENT = "zemledel:guest-city-change";

function isGuestStoredCity(value: unknown): value is GuestStoredCity {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.regionCode === "string" &&
    typeof v.regionName === "string"
  );
}

export function readGuestCity(): GuestStoredCity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GUEST_CITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isGuestStoredCity(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeGuestCity(next: GuestStoredCity | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!next) {
      window.localStorage.removeItem(GUEST_CITY_STORAGE_KEY);
    } else {
      window.localStorage.setItem(GUEST_CITY_STORAGE_KEY, JSON.stringify(next));
    }
  } finally {
    window.dispatchEvent(new Event(GUEST_CITY_CHANGE_EVENT));
  }
}

export function subscribeGuestCity(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = () => onChange();
  window.addEventListener("storage", handler);
  window.addEventListener(GUEST_CITY_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(GUEST_CITY_CHANGE_EVENT, handler);
  };
}

