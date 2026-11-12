import type { ServicePaletteColor, ServicePlace } from "@/entities/service";

export type ServiceFormState = {
  categoryId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  title: string;
  price: string;
  stockBadge: string;
  description: string;
  paletteColor: ServicePaletteColor | "";
};

export type NewServiceDraft = {
  version: 1;
  form: ServiceFormState;
  places: ServicePlace[];
  placesEdited?: boolean;
  allRussia: boolean;
  images: string[];
  mainPhotoKey?: string | null;
  savedServiceId: string | null;
  photos: string[];
};

export function serviceDraftStorageKey(userId: string, providerId: string) {
  return `zemledel:new-service:v1:${encodeURIComponent(userId)}:${encodeURIComponent(providerId)}`;
}

export function draftPhotoKey(file: File) {
  return JSON.stringify([file.name, file.size, file.lastModified, file.type]);
}

export function readNewServiceDraft(key: string): NewServiceDraft | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const value = JSON.parse(raw) as NewServiceDraft;
  if (
    value?.version !== 1 ||
    !value.form ||
    !["categoryId", "title", "price", "stockBadge", "description", "paletteColor"].every(
      (field) => typeof value.form[field as keyof ServiceFormState] === "string",
    ) ||
    !Array.isArray(value.places) ||
    !value.places.every((place) => place &&
      ["city", "region"].includes(place.kind) &&
      typeof place.name === "string" &&
      typeof place.regionCode === "string" &&
      typeof place.regionName === "string" &&
      (place.kind !== "city" || typeof place.cityId === "string")) ||
    typeof value.allRussia !== "boolean" ||
    !Array.isArray(value.images) ||
    !value.images.every((url) => typeof url === "string" && /^https?:\/\//.test(url)) ||
    !(value.mainPhotoKey == null || typeof value.mainPhotoKey === "string") ||
    !(value.savedServiceId === null || typeof value.savedServiceId === "string") ||
    !Array.isArray(value.photos) ||
    !value.photos.every((id) => typeof id === "string")
  ) throw new Error("Invalid service draft");
  return value;
}

export function writeNewServiceDraft(key: string, draft: NewServiceDraft) {
  localStorage.setItem(key, JSON.stringify(draft));
}

// Original files exceed localStorage's quota quickly; keep only their IDs in
// the form snapshot and store the files themselves without conversion in IDB.
async function photoStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("zemledel-service-drafts", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("photos");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction("photos", mode);
      const request = operation(transaction.objectStore("photos"));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function readDraftPhotos(key: string): Promise<File[]> {
  const files: unknown = await photoStore("readonly", (store) => store.get(key));
  return Array.isArray(files) ? files.filter((file): file is File => file instanceof File) : [];
}

export async function writeDraftPhotos(key: string, files: File[]) {
  await photoStore("readwrite", (store) => store.put(files, key));
}

export async function removeDraftPhotos(key: string) {
  await photoStore("readwrite", (store) => store.delete(key));
}

export async function clearMatchingServiceDraft(key: string, serviceId: string) {
  const draft = readNewServiceDraft(key);
  if (draft?.savedServiceId !== serviceId) return;
  localStorage.removeItem(key);
  await removeDraftPhotos(key);
}
