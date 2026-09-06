export type CityImportRunDto = {
  id: string;
  mode: string;
  sourceLabel: string | null;
  startedAt: string;
  finishedAt: string | null;
  snapshotCount: number;
  addedCount: number;
  deactivatedCount: number;
  reactivatedCount: number;
  updatedCount: number;
};

export type CityImportEventDto = {
  id: string;
  runId: string;
  cityId: string | null;
  garObjectId: string;
  eventType: "ADDED" | "DEACTIVATED" | "REACTIVATED" | "UPDATED";
  name: string;
  regionCode: string;
  regionName: string;
  previousStatus: "ACTIVE" | "INACTIVE" | null;
  newStatus: "ACTIVE" | "INACTIVE";
};

export type CitySuggestItemDto = {
  id: string;
  name: string;
  regionCode: string;
  regionName: string;
  displayName: string;
};
