import {
  getRequestDisplayStatusLabel,
  type RequestProDto,
} from "@/entities/request";

type ProviderRequestScreenModel = {
  mode: "deal" | "archived";
  statusLabel: string;
  showDealWorkflow: boolean;
  showCadastralPanel: boolean;
};

export function resolveProviderRequestScreenModel(
  request: Pick<RequestProDto, "isLocked" | "status" | "lockedAt" | "totalAmountRubles">,
): ProviderRequestScreenModel {
  if (!request.isLocked) {
    return {
      mode: "deal",
      statusLabel: getRequestDisplayStatusLabel(request),
      showDealWorkflow: true,
      showCadastralPanel: true,
    };
  }

  return {
    mode: "archived",
    statusLabel:
      request.status === "COMPLETED"
        ? "Завершена другим исполнителем"
        : "Работу выполняет другой исполнитель",
    showDealWorkflow: false,
    showCadastralPanel: false,
  };
}
