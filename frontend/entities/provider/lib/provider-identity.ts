import type { AuthMembership, AuthPerson, ProviderType } from "@/core/auth/authorization";

export type ProviderIdentity = {
  /** Подпись мелким шрифтом над названием. У ИП тип уже входит в название. */
  readonly kindLabel: string | null;
  readonly title: string;
  readonly initials: string;
};

const KIND_LABELS: Record<ProviderType, string | null> = {
  COMPANY: "Организация",
  SOLE_PROPRIETOR: null,
  SELF_EMPLOYED: "Самозанятый",
  INDIVIDUAL: "Физическое лицо",
};

const LEGAL_FORMS = new Set([
  "ООО",
  "ОАО",
  "ЗАО",
  "ПАО",
  "НАО",
  "АО",
  "НКО",
  "АНО",
  "ГУП",
  "МУП",
  "ТСЖ",
  "СНТ",
  "КФХ",
]);

const FALLBACK_TITLE = "Исполнитель";

function words(value: string | null | undefined): string[] {
  return value?.trim().split(/\s+/).filter(Boolean) ?? [];
}

function initial(value: string | null | undefined): string {
  return value?.trim().charAt(0).toUpperCase() ?? "";
}

/** «ооо Бурый Медведь» → «ООО Бурый Медведь»: форма собственности пишется заглавными. */
function normalizeCompanyName(name: string): string {
  const [first, ...rest] = words(name);
  if (!first) return "";
  const form = first.toUpperCase();
  return [LEGAL_FORMS.has(form) ? form : first, ...rest].join(" ");
}

/** Инициалы аватара без формы собственности и кавычек: «ООО "Бурый медведь"» → «БМ». */
function companyInitials(name: string): string {
  const [first, ...rest] = words(name.replace(/[«»"„“”']/g, " "));
  const meaningful = first && LEGAL_FORMS.has(first.toUpperCase()) ? rest : [first, ...rest];
  return meaningful.slice(0, 2).map(initial).join("");
}

function formatSurnameWithInitials(person: AuthPerson): string {
  const initials = [person.firstName, person.middleName]
    .map(initial)
    .filter(Boolean)
    .map((letter) => `${letter}.`);
  return [person.lastName.trim(), ...initials].join(" ");
}

/**
 * «Усов Павел Николаевич» → «Усов П. Н.».
 * Why: в старых сессиях ФИО нет, а полное имя хранится как «Имя Фамилия» — тогда «Усов П.».
 */
export function formatSurnameInitials(
  person: AuthPerson | null | undefined,
  fullName?: string | null,
): string {
  if (person) return formatSurnameWithInitials(person);
  const parts = words(fullName);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[parts.length - 1]} ${initial(parts[0])}.`;
}

export function formatProviderIdentity(
  membership: Pick<AuthMembership, "providerName" | "providerType" | "providerPerson">,
): ProviderIdentity {
  const kindLabel = KIND_LABELS[membership.providerType] ?? null;
  const name = membership.providerName?.trim() ?? "";
  const person = membership.providerPerson ?? null;

  if (membership.providerType === "COMPANY") {
    const title = normalizeCompanyName(name) || FALLBACK_TITLE;
    return { kindLabel, title, initials: companyInitials(title) || initial(title) };
  }

  const personInitials = person ? `${initial(person.firstName)}${initial(person.lastName)}` : "";

  if (membership.providerType === "SOLE_PROPRIETOR") {
    const title = person ? `ИП ${formatSurnameWithInitials(person)}` : name || FALLBACK_TITLE;
    const nameWithoutForm = words(name).filter((part) => part.toUpperCase() !== "ИП");
    return {
      kindLabel,
      title,
      initials: personInitials || initial(nameWithoutForm[0]) || initial(title),
    };
  }

  const title = formatSurnameInitials(person, name) || FALLBACK_TITLE;
  const fallbackInitials = words(name)
    .filter((_, index, all) => index === 0 || index === all.length - 1)
    .map(initial)
    .join("");
  return { kindLabel, title, initials: personInitials || fallbackInitials || initial(title) };
}
