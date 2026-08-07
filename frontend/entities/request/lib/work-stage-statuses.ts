import type { WorkStageStatusOptionDto } from "../dto/work-stage.dto";

export const SYSTEM_WORK_STAGE_STATUSES: readonly WorkStageStatusOptionDto[] = [
  { key: "INITIAL_CONSULTATION", label: "Первичная консультация" },
  { key: "DOC_COLLECTION", label: "Сбор документов" },
  { key: "DOC_PREPARATION", label: "Подготовка документов" },
  { key: "SUBMITTED_TO_AUTHORITY", label: "Подано в орган" },
  { key: "AWAITING_RESPONSE", label: "Ожидание ответа" },
  { key: "REVISION", label: "Доработка" },
  { key: "ACCEPTANCE_CERTIFICATE_PREP", label: "Подготовка акта приёма-передачи" },
  { key: "SERVICE_ACT_PREP", label: "Подготовка акта об оказании услуг" },
  { key: "COMPLETED", label: "Завершено" },
  { key: "SUSPENDED", label: "Приостановлено" },
  { key: "LEASE_AGREEMENT_PREP", label: "Подготовка договора аренды" },
];

export function mergeWorkStageStatusOptions(
  custom: readonly WorkStageStatusOptionDto[]
): WorkStageStatusOptionDto[] {
  const customKeys = new Set(custom.map((item) => item.key));
  return [
    ...SYSTEM_WORK_STAGE_STATUSES,
    ...custom.filter((item) => item.key.trim() && item.label.trim() && !customKeys.has("")),
  ].filter((item, index, arr) => arr.findIndex((x) => x.key === item.key) === index);
}

export function createCustomWorkStageStatusKey() {
  return `custom_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}
