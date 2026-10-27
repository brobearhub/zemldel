import type { ProfileMenuSection } from "./profile-menu-section";

/** От чьего имени исполнитель сейчас работает: кабинет исполнителя или контактное лицо. */
export type ProviderMenuMode = "provider" | "contact";

const STORAGE_KEY = "ui.profileMenu.providerMode";

/**
 * Why: в кабинете режим задаёт сам раздел, а на страницах сайта меню помнит последний выбор.
 * Без выбора исполнитель остаётся в кабинете — так он попадает туда после регистрации.
 */
export function resolveProviderMenuMode(
  section: ProfileMenuSection | null,
  stored: ProviderMenuMode | null,
): ProviderMenuMode {
  if (section === "pro") return "provider";
  if (section === "profile") return "contact";
  return stored ?? "provider";
}

export function readProviderMenuMode(): ProviderMenuMode | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "provider" || raw === "contact" ? raw : null;
  } catch {
    return null;
  }
}

export function saveProviderMenuMode(mode: ProviderMenuMode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

/** «Павел Усов» → «Павел У.» */
export function formatContactShortName(name: string | null | undefined): string | null {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}
