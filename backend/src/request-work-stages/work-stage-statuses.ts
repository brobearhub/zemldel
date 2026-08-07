export const SYSTEM_WORK_STAGE_STATUSES = [
  { key: 'INITIAL_CONSULTATION', label: 'Первичная консультация' },
  { key: 'DOC_COLLECTION', label: 'Сбор документов' },
  { key: 'DOC_PREPARATION', label: 'Подготовка документов' },
  { key: 'SUBMITTED_TO_AUTHORITY', label: 'Подано в орган' },
  { key: 'AWAITING_RESPONSE', label: 'Ожидание ответа' },
  { key: 'REVISION', label: 'Доработка' },
  { key: 'ACCEPTANCE_CERTIFICATE_PREP', label: 'Подготовка акта приёма-передачи' },
  { key: 'SERVICE_ACT_PREP', label: 'Подготовка акта об оказании услуг' },
  { key: 'COMPLETED', label: 'Завершено' },
  { key: 'SUSPENDED', label: 'Приостановлено' },
  { key: 'LEASE_AGREEMENT_PREP', label: 'Подготовка договора аренды' },
] as const;

export type SystemWorkStageStatusKey =
  (typeof SYSTEM_WORK_STAGE_STATUSES)[number]['key'];

export type WorkStageStatusOption = {
  key: string;
  label: string;
};

const SYSTEM_KEY_SET = new Set<string>(
  SYSTEM_WORK_STAGE_STATUSES.map((item) => item.key),
);

const SYSTEM_LABEL_BY_KEY = new Map<string, string>(
  SYSTEM_WORK_STAGE_STATUSES.map((item) => [item.key, item.label]),
);

export function isSystemWorkStageStatusKey(
  key: string,
): key is SystemWorkStageStatusKey {
  return SYSTEM_KEY_SET.has(key);
}

export function resolveStatusLabel(
  statusKey: string,
  custom: readonly WorkStageStatusOption[],
): string | null {
  const systemLabel = SYSTEM_LABEL_BY_KEY.get(statusKey);
  if (systemLabel) return systemLabel;
  const customMatch = custom.find((item) => item.key === statusKey);
  if (!customMatch) return null;
  const label = customMatch.label.trim();
  return label.length > 0 ? label : null;
}
