import type { WorkStageDocSlotStatus } from "@/entities/request";

export type ClientStageActionKind = "UPLOAD_REQUIRED_DOCUMENTS";

export type ClientStageAction = {
  readonly kind: ClientStageActionKind;
};

type ClientStageActionsSource = {
  readonly docSlots: readonly { readonly status: WorkStageDocSlotStatus }[];
};

/**
 * Why: единая точка для «что клиенту ещё нужно сделать на этапе»;
 * UI только смотрит на наличие действий (иконка), список легко расширять новыми kind.
 */
export function getClientStageActions(stage: ClientStageActionsSource): ClientStageAction[] {
  const actions: ClientStageAction[] = [];

  if (stage.docSlots.some((slot) => slot.status === "REQUESTED")) {
    actions.push({ kind: "UPLOAD_REQUIRED_DOCUMENTS" });
  }

  return actions;
}

export function hasClientStageActions(stage: ClientStageActionsSource): boolean {
  return getClientStageActions(stage).length > 0;
}
