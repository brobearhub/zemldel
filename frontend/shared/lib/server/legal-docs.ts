import "server-only";

import { fetchBackendJson } from "@/shared/api/backend/server";

export type LegalDocId = "terms" | "privacy" | "consent" | "offer";

export type LegalDocCurrent = {
  id: LegalDocId;
  version: string;
  title: string;
  markdown: string;
};

export async function loadLegalDoc(id: LegalDocId): Promise<LegalDocCurrent> {
  return fetchBackendJson<LegalDocCurrent>(`/legal-docs/${id}/current`);
}
