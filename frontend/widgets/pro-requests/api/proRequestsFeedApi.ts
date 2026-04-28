import type { RequestProDto } from "@/entities/request";
import type { DialogScope, EligibleCategory, InboxSettings, InboxStatus } from "@/widgets/pro-requests/model/types";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function fetchInbox(status: InboxStatus, categoryId: string | null, dialogScope: DialogScope) {
  const params = new URLSearchParams();
  params.set("status", status);
  params.set("categoryId", categoryId ?? "null");
  if (status === "DISCUSSING") {
    params.set("dialogScope", dialogScope);
  }

  const res = await fetch(`/api/pro/requests/inbox?${params.toString()}`, { cache: "no-store" });
  const payload = (await res.json().catch(() => null)) as RequestProDto[] | { error?: string } | null;
  if (!res.ok) {
    throw new Error(
      payload && typeof payload === "object" && !Array.isArray(payload) && payload.error ? payload.error : "Не удалось загрузить ленту"
    );
  }
  return (Array.isArray(payload) ? payload : []) as RequestProDto[];
}

export async function fetchEligibleCategories() {
  const res = await fetch("/api/pro/requests/eligible-categories", { cache: "no-store" });
  const payload = (await res.json().catch(() => null)) as EligibleCategory[] | { error?: string } | null;
  if (!res.ok) {
    throw new Error(
      payload && typeof payload === "object" && !Array.isArray(payload) && payload.error ? payload.error : "Не удалось загрузить категории"
    );
  }

  const list = Array.isArray(payload) ? payload : [];
  return list
    .filter((c): c is EligibleCategory => Boolean(c) && typeof c.id === "string" && typeof c.name === "string" && typeof c.slug === "string")
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug }))
    .sort((a, b) => a.slug.localeCompare(b.slug, "ru"));
}

export async function fetchInboxSettings(): Promise<InboxSettings> {
  const res = await fetch("/api/pro/inbox-settings", { cache: "no-store" });
  const payload = (await res.json().catch(() => null)) as InboxSettings | { error?: string } | null;
  if (!res.ok) {
    const serverError =
      payload && typeof payload === "object" && !Array.isArray(payload) && "error" in payload && typeof (payload as any).error === "string"
        ? String((payload as any).error)
        : null;
    throw new Error(serverError ?? "Не удалось загрузить настройки ленты");
  }

  const obj = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Partial<InboxSettings>) : null;
  const status = obj?.status === "DISCUSSING" ? "DISCUSSING" : "NEW";
  const categoryId = obj?.categoryId === null ? null : typeof obj?.categoryId === "string" && isUuid(obj.categoryId) ? obj.categoryId : null;
  const dialogScope = obj?.dialogScope === "ARCHIVE" ? "ARCHIVE" : "ACTIVE";
  return { status, categoryId, dialogScope };
}

export async function putInboxSettings(next: InboxSettings) {
  const res = await fetch("/api/pro/inbox-settings", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(next),
  });
  const payload = (await res.json().catch(() => null)) as InboxSettings | { error?: string } | null;
  if (!res.ok) {
    const serverError =
      payload && typeof payload === "object" && !Array.isArray(payload) && "error" in payload && typeof (payload as any).error === "string"
        ? String((payload as any).error)
        : null;
    throw new Error(serverError ?? "Не удалось сохранить настройки");
  }
}
