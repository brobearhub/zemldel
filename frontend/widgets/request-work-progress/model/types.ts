import type { RequestProviderWorkStatus, WorkStageDto, WorkStageStatusOptionDto } from "@/entities/request";

export type RequestWorkProgressMode = "provider" | "customer";

export type RequestWorkProgressProps = {
  mode: RequestWorkProgressMode;
  requestId: string;
  requestStatus: string;
  providerWorkStatus?: RequestProviderWorkStatus | null;
  stages: WorkStageDto[];
  statusOptions: WorkStageStatusOptionDto[];
  busy?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onRefresh: () => Promise<void>;
  onError?: (message: string) => void;
};
