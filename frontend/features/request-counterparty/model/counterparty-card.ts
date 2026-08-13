export type CounterpartyField = {
  readonly label: string;
  readonly value: string | null;
};

export function canShowProviderCounterpartyButton(input: {
  lockedAt: string | null | undefined;
  isLocked: boolean;
}): boolean {
  return input.lockedAt != null && !input.isLocked;
}

export function canShowCustomerCounterpartyButton(input: {
  lockedAt: string | null | undefined;
}): boolean {
  return input.lockedAt != null;
}

export function getCustomerContactFields(input: {
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
}): readonly CounterpartyField[] {
  return [
    { label: "ФИО", value: input.customerName },
    { label: "Телефон", value: input.customerPhone },
    { label: "Email", value: input.customerEmail },
  ];
}

export function getProviderContactFields(input: {
  providerName: string | null;
  providerPhone: string | null;
  providerEmail: string | null;
}): readonly CounterpartyField[] {
  return [
    { label: "Название", value: input.providerName },
    { label: "Телефон", value: input.providerPhone },
    { label: "Email", value: input.providerEmail },
  ];
}

export function hasAnyCounterpartyValue(fields: readonly CounterpartyField[]): boolean {
  return fields.some((field) => Boolean(field.value?.trim()));
}

/** Инициалы: первая буква имени, затем первая буква фамилии (порядок ФИО: фамилия имя [отчество]). */
export function getCounterpartyInitials(name: string | null | undefined): string {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  const lastName = parts[0];
  const firstName = parts[1];
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
}
