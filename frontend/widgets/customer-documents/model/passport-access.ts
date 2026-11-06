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
  audit: Array<{ id: string; action: string; actorUserId: string | null; actorProviderId: string | null; requestId: string | null; createdAt: string }>;
};
export const passportAccessUrl = "/api/documents/passport/access";
export const passportKindLabel = (kind: "FORM" | "PHOTO") => kind === "FORM" ? "Анкета" : "Фотографии";
export function passportAccessError(body: { message?: unknown; error?: unknown }, fallback: string) {
  return typeof body?.message === "string" ? body.message : typeof body?.error === "string" ? body.error : fallback;
}
