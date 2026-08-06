export type CustomerContractBundleStatus = "PENDING_CUSTOMER" | "APPROVED" | "REVISION_REQUESTED";

export type CustomerContractBundleFile = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerContractBundleItem = {
  bundleId: string;
  status: CustomerContractBundleStatus;
  revisionMessage: string | null;
  decidedAt: string | null;
  document: CustomerContractBundleFile;
  signature: CustomerContractBundleFile | null;
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

export async function fetchCustomerRequestContractBundles(requestId: string): Promise<CustomerContractBundleItem[]> {
  const res = await fetch(`/api/requests/${requestId}/contract-bundles`, { cache: "no-store" });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось загрузить договоры"));
  return Array.isArray(payload) ? (payload as CustomerContractBundleItem[]) : [];
}

export async function approveCustomerRequestContractBundle(requestId: string, bundleId: string): Promise<{ ok: true }> {
  const res = await fetch(`/api/requests/${requestId}/contract-bundles/${bundleId}/approve`, { method: "POST" });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось одобрить"));
  return { ok: true };
}

export async function requestCustomerRequestContractBundleRevision(requestId: string, bundleId: string, message: string): Promise<{ ok: true }> {
  const res = await fetch(`/api/requests/${requestId}/contract-bundles/${bundleId}/revision`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
  });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось отправить на доработку"));
  return { ok: true };
}

