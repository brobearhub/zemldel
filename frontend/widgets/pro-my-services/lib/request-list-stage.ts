import { getRequestFlowActiveStepId, type RequestStatus } from "@/entities/request";

/** Шаги шапки списка. Совпадают со степпером карточки заявки. */
export const REQUEST_LIST_STAGES = ["NEW", "DISCUSSING", "CONTRACT", "WORK", "ACCEPTANCE", "COMPLETED"] as const;

export type RequestListStage = (typeof REQUEST_LIST_STAGES)[number];

const STAGE_LABELS: Record<RequestListStage, string> = {
  NEW: "Новые",
  DISCUSSING: "Обсуждение",
  CONTRACT: "Договор",
  WORK: "В работе",
  ACCEPTANCE: "Принятие",
  COMPLETED: "Завершена",
};

type StageInput = {
  status: RequestStatus;
  lockedAt: string | null;
};

function emptyStageCounts(): Record<RequestListStage, number> {
  return {
    NEW: 0,
    DISCUSSING: 0,
    CONTRACT: 0,
    WORK: 0,
    ACCEPTANCE: 0,
    COMPLETED: 0,
  };
}

/**
 * Why: фильтр списка и степпер должны называть один и тот же шаг.
 * «Договор» и «Принятие» в модели не статусы, их уже собирает степпер.
 */
export function getRequestListStage(request: StageInput): RequestListStage | null {
  const stepId = getRequestFlowActiveStepId(request);
  if (stepId === "NEW") return "NEW";
  if (stepId === "DISCUSSING") return "DISCUSSING";
  if (stepId === "CONTRACT") return "CONTRACT";
  if (stepId === "WORK") return "WORK";
  if (stepId === "ACCEPTANCE") return "ACCEPTANCE";
  if (stepId === "COMPLETED") return "COMPLETED";
  return null;
}

export function getRequestListStageLabel(stage: RequestListStage): string {
  return STAGE_LABELS[stage];
}

/** Why: число у заголовка — все живые заявки этой области, «Завершена» в сумму не входит. */
export function countOpenRequests(counts: Record<RequestListStage, number>): number {
  return REQUEST_LIST_STAGES.reduce((sum, stage) => (stage === "COMPLETED" ? sum : sum + counts[stage]), 0);
}

export function countRequestsByStage<T extends StageInput>(requests: readonly T[]): Record<RequestListStage, number> {
  const counts = emptyStageCounts();
  for (const request of requests) {
    const stage = getRequestListStage(request);
    if (stage) counts[stage] += 1;
  }
  return counts;
}

/** Why: пустой фильтр показывает весь список панели, выбранный — только свой шаг. */
export function filterRequestsByStage<T extends StageInput>(
  requests: readonly T[],
  stage: RequestListStage | null,
): T[] {
  if (stage === null) return [...requests];
  return requests.filter((request) => getRequestListStage(request) === stage);
}
