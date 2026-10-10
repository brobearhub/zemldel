export function mergeStoryComments<T extends { id: string }>(server: readonly T[], local: readonly T[]): T[] {
  const serverIds = new Set(server.map((item) => item.id));
  const pending = local.filter((item) => item.id.startsWith("pending-") && !serverIds.has(item.id));
  return [...server, ...pending];
}

export function commentWasEdited(createdAt: string, updatedAt: string): boolean {
  const created = Date.parse(createdAt);
  const updated = Date.parse(updatedAt);
  if (!Number.isFinite(created) || !Number.isFinite(updated)) return false;
  return updated - created > 1000;
}
