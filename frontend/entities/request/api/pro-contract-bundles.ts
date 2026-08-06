export type ProContractBundleStatus = "PENDING_CUSTOMER" | "APPROVED" | "REVISION_REQUESTED";

export type ProContractBundleFile = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProContractBundleItem = {
  bundleId: string;
  status: ProContractBundleStatus;
  revisionMessage: string | null;
  decidedAt: string | null;
  document: ProContractBundleFile;
  signature: ProContractBundleFile | null;
  createdAt: string;
  updatedAt: string;
};

export type ProMiscFileItem = {
  id: string;
  status: ProContractBundleStatus;
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

export async function fetchProRequestContractBundles(requestId: string): Promise<ProContractBundleItem[]> {
  const res = await fetch(`/api/pro/requests/${requestId}/contract-bundles`, { cache: "no-store" });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось загрузить договоры"));
  return Array.isArray(payload) ? (payload as ProContractBundleItem[]) : [];
}

export async function uploadProRequestContractBundle(requestId: string, input: { document: File; signature: File }) {
  const form = new FormData();
  form.append("document", input.document);
  form.append("signature", input.signature);
  const res = await fetch(`/api/pro/requests/${requestId}/contract-bundles`, { method: "POST", body: form });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось загрузить договор"));
  return payload as { bundleId: string };
}

export async function deleteProRequestContractBundle(requestId: string, bundleId: string): Promise<{ ok: true }> {
  const res = await fetch(`/api/pro/requests/${requestId}/contract-bundles/${bundleId}`, { method: "DELETE" });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось удалить договор"));
  return { ok: true };
}

export async function fetchProRequestMiscFiles(requestId: string): Promise<ProMiscFileItem[]> {
  const res = await fetch(`/api/pro/requests/${requestId}/provider-misc`, { cache: "no-store" });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось загрузить документы"));
  return Array.isArray(payload) ? (payload as ProMiscFileItem[]) : [];
}

export async function uploadProRequestMiscFiles(requestId: string, files: File[]) {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  const res = await fetch(`/api/pro/requests/${requestId}/provider-misc`, { method: "POST", body: form });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось загрузить документы"));
  return payload as { created?: Array<{ id: string }> };
}

