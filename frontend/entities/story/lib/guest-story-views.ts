const GUEST_STORY_VIEWS_KEY = "zemledel.storyViews";

export function readGuestStoryViews(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(GUEST_STORY_VIEWS_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function rememberGuestStoryView(storyId: string) {
  const next = [...new Set([...readGuestStoryViews(), storyId])].slice(-200);
  window.localStorage.setItem(GUEST_STORY_VIEWS_KEY, JSON.stringify(next));
}

export function markStoriesViewed<T extends { id: string; viewed?: boolean }>(
  items: readonly T[],
  seenIds: readonly string[],
): T[] {
  const seen = new Set(seenIds);
  return items.map((item) => (item.viewed || seen.has(item.id) ? { ...item, viewed: true } : item));
}

export function liftUnseenStories<T extends { id: string; viewed?: boolean }>(
  items: readonly T[],
  seenIds: readonly string[],
): T[] {
  const seen = new Set(seenIds);
  const unseen = items.filter((item) => !item.viewed && !seen.has(item.id));
  const viewed = items.filter((item) => item.viewed || seen.has(item.id));
  return [...unseen, ...viewed];
}
