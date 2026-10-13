import type { ProviderType } from "@/entities/provider";

/**
 * Имя профиля уже собрано на сервере: физлицо и самозанятый «Имя Фамилия»,
 * ИП «ИП Фамилия И. О.», организация — полное наименование.
 */
function sentence(text: string): string {
  return text.endsWith(".") ? text : `${text}.`;
}

export function providerHeroGreeting(name: string, type: ProviderType): string {
  const trimmed = name.trim();
  if (type === "COMPANY") return sentence(`Привет! Мы ${trimmed}`);
  return sentence(`Привет! Я ${trimmed}`);
}

export function providerHeroCaption(name: string): string {
  return name.trim();
}

export function providerHeroIntro(about: string | null | undefined, subtitle: string): string {
  const pitch = about?.trim() ?? "";
  if (pitch) return pitch;
  return subtitle.trim();
}
