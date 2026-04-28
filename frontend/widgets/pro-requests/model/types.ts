import type { RequestProDto } from "@/entities/request";

export type InboxStatus = "NEW" | "DISCUSSING";
export type DialogScope = "ACTIVE" | "ARCHIVE";
export type InboxSettings = { status: InboxStatus; categoryId: string | null; dialogScope: DialogScope };
export type EligibleCategory = { id: string; name: string; slug: string };
export type ItemsByStatus = Record<InboxStatus, RequestProDto[]>;

export const DEFAULT_SETTINGS: InboxSettings = { status: "NEW", categoryId: null, dialogScope: "ACTIVE" };

export const STATUS_CHIPS = [
  { id: "NEW", label: "Новые" },
  { id: "DISCUSSING", label: "Диалог" },
] as const satisfies ReadonlyArray<{ id: InboxStatus; label: string }>;
