import type { ProviderDocument } from "@/entities/provider-document/api/documents";
import {
  fetchIdempotentWrite,
  forgetWriteIntent,
} from "@/shared/api/idempotent-write";
import {
  validateContractUploadFiles,
  validateContractSignature,
  contractUploadError,
} from "../lib/contract-upload-validation";
import { prepareRequestDocumentUpload } from "../lib/request-document-upload";

export type ProContractBundleStatus =
  | "PENDING_CUSTOMER"
  | "APPROVED"
  | "REVISION_REQUESTED";

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
  visibleToCustomer: boolean;
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

export async function fetchProRequestContractBundles(
  requestId: string,
): Promise<ProContractBundleItem[]> {
  const res = await fetch(`/api/pro/requests/${requestId}/contract-bundles`, {
    cache: "no-store",
  });
  const payload = await safeJson(res);
  if (!res.ok)
    throw new Error(extractError(payload, "Не удалось загрузить договоры"));
  return Array.isArray(payload) ? (payload as ProContractBundleItem[]) : [];
}

export type ContractBundleUpload = {
  document: File | null;
  sourceDocument?: ProviderDocument | null;
  signature?: File | null;
};

export async function uploadProRequestContractBundle(
  requestId: string,
  input: ContractBundleUpload,
) {
  if (!input.document && !input.sourceDocument)
    throw new Error("Выберите файл договора.");
  const validation = input.document
    ? validateContractUploadFiles(input.document, input.signature)
    : validateContractSignature(input.signature);
  if (validation) throw new Error(validation);
  const form = new FormData();
  if (input.sourceDocument)
    form.append("sourceDocumentId", input.sourceDocument.id);
  else if (input.document)
    form.append("document", await prepareRequestDocumentUpload(input.document));
  if (input.signature) form.append("signature", input.signature);
  let res: Response;
  try {
    res = await fetchIdempotentWrite(
      `/api/pro/requests/${requestId}/contract-bundles`,
      { method: "POST", body: form },
    );
  } catch {
    throw new Error(
      "Нет соединения с сервером. Проверьте интернет и повторите загрузку — выбранные файлы сохранены.",
    );
  }
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(contractUploadError(payload, res.status));
  return payload as { bundleId: string };
}

export async function deleteProRequestContractBundle(
  requestId: string,
  bundleId: string,
): Promise<{ ok: true }> {
  const res = await fetch(
    `/api/pro/requests/${requestId}/contract-bundles/${bundleId}`,
    { method: "DELETE" },
  );
  const payload = await safeJson(res);
  if (!res.ok)
    throw new Error(extractError(payload, "Не удалось удалить договор"));
  forgetWriteIntent(`/api/pro/requests/${requestId}/contract-bundles`);
  return { ok: true };
}

export async function fetchProRequestMiscFiles(
  requestId: string,
): Promise<ProMiscFileItem[]> {
  const res = await fetch(`/api/pro/requests/${requestId}/provider-misc`, {
    cache: "no-store",
  });
  const payload = await safeJson(res);
  if (!res.ok)
    throw new Error(extractError(payload, "Не удалось загрузить документы"));
  return Array.isArray(payload) ? (payload as ProMiscFileItem[]) : [];
}

export async function uploadProRequestMiscFiles(
  requestId: string,
  files: File[],
  visibleToCustomer: boolean,
  sourceDocuments: ProviderDocument[] = [],
) {
  const form = new FormData();
  // Process sequentially to avoid decoding several large photos at once.
  for (const file of files)
    form.append("files", await prepareRequestDocumentUpload(file));
  if (files.length + sourceDocuments.length > 10)
    throw new Error("Выберите не более 10 файлов.");
  if (sourceDocuments.length)
    form.append(
      "sourceDocumentIds",
      JSON.stringify(sourceDocuments.map((file) => file.id)),
    );
  form.append("visibleToCustomer", String(visibleToCustomer));
  const res = await fetch(`/api/pro/requests/${requestId}/provider-misc`, {
    method: "POST",
    body: form,
  });
  const payload = await safeJson(res);
  if (!res.ok)
    throw new Error(extractError(payload, "Не удалось загрузить документы"));
  return payload as { created?: Array<{ id: string }> };
}

export async function setProRequestMiscFileVisibility(
  requestId: string,
  fileId: string,
  visibleToCustomer: boolean,
): Promise<{ id: string; visibleToCustomer: boolean }> {
  const response = await fetch(
    `/api/pro/requests/${encodeURIComponent(requestId)}/provider-misc/${encodeURIComponent(fileId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibleToCustomer }),
    },
  );
  const payload = await safeJson(response);
  if (!response.ok)
    throw new Error(
      extractError(payload, "Не удалось изменить видимость файла."),
    );
  return payload as { id: string; visibleToCustomer: boolean };
}
