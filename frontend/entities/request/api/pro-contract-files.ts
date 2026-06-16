export type ProContractFileStatus = "PENDING_CUSTOMER" | "APPROVED" | "REVISION_REQUESTED";

export type ProContractFileItem = {
  id: string;
  status: ProContractFileStatus;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  revisionMessage: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

async function safeJson(res: Response) {
  return (await res.json().catch(() => null)) as unknown;
}

function extractError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const value = (payload as any).error;
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return fallback;
}

export async function fetchProRequestContractFiles(requestId: string): Promise<ProContractFileItem[]> {
  const res = await fetch(`/api/pro/requests/${requestId}/contract-files`, { cache: "no-store" });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось загрузить файлы договора"));
  return Array.isArray(payload) ? (payload as ProContractFileItem[]) : [];
}

export async function uploadProRequestContractFiles(requestId: string, files: File[]) {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  const res = await fetch(`/api/pro/requests/${requestId}/contract-files`, { method: "POST", body: form });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось загрузить файлы"));
  return payload as { created?: Array<{ id: string }> };
}

