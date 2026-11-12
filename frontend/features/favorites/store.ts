"use client";
import { favoritesJson } from "./api";
export type FavoriteKind = "services" | "providers";
type Entry = { saved: boolean; loading: boolean; error?: string };
const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
const pending = new Map<
  string,
  { userId: string; kind: FavoriteKind; id: string }
>();
let scheduled = false;
const initial: Entry = { saved: false, loading: true };
const keyOf = (userId: string, kind: FavoriteKind, id: string) =>
  `${userId}:${kind}:${id}`;
function emit() {
  for (const listener of listeners) listener();
}
export function subscribeFavorites(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function favoriteSnapshot(
  userId: string,
  kind: FavoriteKind,
  id: string,
) {
  return entries.get(keyOf(userId, kind, id)) ?? initial;
}
export function seedFavorite(
  userId: string,
  kind: FavoriteKind,
  id: string,
  saved: boolean,
) {
  entries.set(keyOf(userId, kind, id), { saved, loading: false });
  emit();
}
export function loadFavorite(userId: string, kind: FavoriteKind, id: string) {
  const key = keyOf(userId, kind, id);
  if (entries.has(key) && !entries.get(key)?.error) return;
  pending.set(key, { userId, kind, id });
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(async () => {
    scheduled = false;
    const batch = [...pending.values()];
    pending.clear();
    for (const uid of new Set(batch.map((item) => item.userId))) {
      const own = batch.filter((item) => item.userId === uid);
      for (let offset = 0; offset < own.length; offset += 100) {
        const chunk = own.slice(offset, offset + 100);
        try {
          const data = await favoritesJson<{
            services: string[];
            providers: string[];
          }>("/api/favorites/states", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              serviceIds: chunk
                .filter((item) => item.kind === "services")
                .map((item) => item.id),
              providerIds: chunk
                .filter((item) => item.kind === "providers")
                .map((item) => item.id),
            }),
          });
          for (const item of chunk)
            entries.set(keyOf(uid, item.kind, item.id), {
              saved: data[item.kind].includes(item.id),
              loading: false,
            });
        } catch (error) {
          for (const item of chunk)
            entries.set(keyOf(uid, item.kind, item.id), {
              saved: false,
              loading: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Не удалось загрузить избранное",
            });
        }
        emit();
      }
    }
  });
}
export async function toggleFavorite(
  userId: string,
  kind: FavoriteKind,
  id: string,
) {
  const key = keyOf(userId, kind, id);
  const before = entries.get(key);
  if (!before || before.loading) return;
  if (before.error) {
    entries.delete(key);
    loadFavorite(userId, kind, id);
    emit();
    return;
  }
  entries.set(key, { saved: !before.saved, loading: true });
  emit();
  try {
    const result = await favoritesJson<{ saved: boolean }>(
      `/api/favorites/${kind}/${id}`,
      { method: before.saved ? "DELETE" : "POST" },
    );
    entries.set(key, { saved: result.saved, loading: false });
    window.dispatchEvent(
      new CustomEvent("favorites.changed", {
        detail: { kind, id, saved: result.saved },
      }),
    );
  } catch (error) {
    entries.set(key, { saved: before.saved, loading: false });
    throw error;
  } finally {
    emit();
  }
}
