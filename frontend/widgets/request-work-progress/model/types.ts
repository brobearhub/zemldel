import type { WorkStageDto, WorkStageStatusOptionDto } from "@/entities/request";

export type RequestWorkProgressMode = "provider" | "customer";

export type RequestWorkProgressProps = {
  mode: RequestWorkProgressMode;
  requestId: string;
  requestStatus: string;
  stages: WorkStageDto[];
  statusOptions: WorkStageStatusOptionDto[];
  busy?: boolean;
  onRefresh: () => Promise<void>;
  onError?: (message: string) => void;
};
