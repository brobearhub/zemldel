export type PassportGrant = {
  requestId: string;
  kind: "FORM" | "PHOTO";
  providerId: string;
  providerName: string;
  requestTitle: string;
  expiresAt: string;
  active: boolean;
};
export type PassportAccessState = {
  hasForm: boolean;
  photoCount: number;
  grants: PassportGrant[];
  requests?: PassportAccessRequest[];
  audit: Array<{ id: string; action: string; actorUserId: string | null; actorProviderId: string | null; requestId: string | null; createdAt: string }>;
};
export const passportAccessUrl = "/api/documents/passport/access";
export const passportKindLabel = (kind: "FORM" | "PHOTO") => kind === "FORM" ? "Данные паспорта" : "Фотографии паспорта";
export function passportAccessError(body: { message?: unknown; error?: unknown }, fallback: string) {
  return typeof body?.message === "string" ? body.message : typeof body?.error === "string" ? body.error : fallback;
}

export type PassportAccessRequest = {
  requestId: string;
  kind: "FORM" | "PHOTO";
  providerId: string;
  providerName: string;
  requestTitle: string;
  requestNumber: number | null;
  createdAt: string;
};

export const PASSPORT_REQUESTS_CHANGED = "passport-requests:changed";
export function refreshPassportRequests() {
  window.dispatchEvent(new Event(PASSPORT_REQUESTS_CHANGED));
}
