export type WorkStageLifecycle = "DRAFT" | "PUBLISHED";
export type WorkStageDocSlotStatus = "REQUESTED" | "UPLOADED";

export type WorkStageFileDto = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  createdAt: string;
};

export type WorkStageDocSlotDto = {
  id: string;
  title: string;
  status: WorkStageDocSlotStatus;
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  uploadedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkStageDto = {
  id: string;
  requestId: string;
  title: string;
  description: string;
  statusKey: string;
  statusLabel: string;
  lifecycle: WorkStageLifecycle;
  publishedAt: string | null;
  sortOrder: number;
  files: WorkStageFileDto[];
  docSlots: WorkStageDocSlotDto[];
  createdAt: string;
  updatedAt: string;
};

export type WorkStageStatusOptionDto = {
  key: string;
  label: string;
};

export type WorkStageStatusesDto = {
  system: WorkStageStatusOptionDto[];
  custom: WorkStageStatusOptionDto[];
};
