import type { CustomerContractBundleFile } from "./customer-contract-bundles";

export type CustomerProviderFile = CustomerContractBundleFile;

export async function fetchCustomerProviderFiles(
  requestId: string,
  signal?: AbortSignal,
): Promise<CustomerProviderFile[]> {
  const response = await fetch(
    `/api/requests/${encodeURIComponent(requestId)}/provider-misc`,
    { cache: "no-store", signal },
  );
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(payload)) {
    throw new Error("Не удалось загрузить документы исполнителя.");
  }
  return payload as CustomerProviderFile[];
}
