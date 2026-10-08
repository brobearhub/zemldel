import type { ProviderType } from "@/entities/provider";

/**
 * Публичное имя физлица хранится как «Фамилия Имя» или «Фамилия Имя Отчество».
 * На странице показываем «Фамилия Имя», без отчества.
 */
export function providerGivenName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
 
  return parts[1] ?? "";
}
export function providerFullName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[1]} ${parts[0]}`;
  return `${parts[0]}`;
}

export function providerHeroGreeting(name: string, type: ProviderType): string {
  const trimmed = name.trim();
  if (type === "COMPANY") return `Привет! Мы ${trimmed}.`;
  return `Привет! Я ${providerGivenName(trimmed)}.`;
}

export function providerHeroCaption(name: string, type: ProviderType): string {
  return type === "COMPANY" ? name.trim() : providerFullName(name);
}

export function providerHeroIntro(about: string | null | undefined, subtitle: string): string {
  const pitch = about?.trim() ?? "";
  if (pitch) return pitch;
  return subtitle.trim();
}
