import { prepareRequestDocumentUpload } from "@/entities/request/lib/request-document-upload";

export type ProviderDocument = {
  id: string;
  folderId: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};
export type ProviderDocumentFolder = { id: string; name: string };
export type ProviderDocumentLibrary = {
  folders: ProviderDocumentFolder[];
  files: ProviderDocument[];
};

export async function documentRequest<T>(
  path = "",
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api/pro/documents${path}`, {
    cache: "no-store",
    ...init,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof payload?.message === "string"
        ? payload.message
        : typeof payload?.error === "string"
          ? payload.error
          : "Не удалось выполнить действие с документами. Попробуйте ещё раз.",
    );
  return payload as T;
}

export function saveDocumentFolder(name: string, id?: string) {
  return documentRequest(`/folders${id ? `/${id}` : ""}`, {
    method: id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function moveProviderDocument(id: string, folderId: string | null) {
  return documentRequest(`/files/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folderId }),
  });
}

export async function uploadProviderDocuments(
  files: File[],
  folderId: string | null,
) {
  if (!files.length || files.length > 10)
    throw new Error("Выберите от 1 до 10 файлов.");
  const form = new FormData();
  if (folderId) form.set("folderId", folderId);
  for (const file of files)
    form.append("files", await prepareRequestDocumentUpload(file));
  return documentRequest("/files", { method: "POST", body: form });
}
