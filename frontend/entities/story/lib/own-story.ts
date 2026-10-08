import type { StoryDto } from "../dto/story.dto";

type StoryViewer = {
  userId: string;
  memberships: ReadonlyArray<{ providerId: string; role: string; status: string }>;
};

/**
 * Своя сторис: пользовательская — если автор текущий пользователь,
 * провайдерская — если у него ACTIVE OWNER или MANAGER этого провайдера.
 * На таком кадре нет действий, которые сервер всё равно отклонит.
 */
export function isOwnStory(
  story: Pick<StoryDto, "authorType" | "authorUserId" | "providerId">,
  viewer: StoryViewer | null,
): boolean {
  if (!viewer) return false;
  if (story.authorType === "USER") return story.authorUserId === viewer.userId;
  if (!story.providerId) return false;
  return viewer.memberships.some(
    (membership) =>
      membership.providerId === story.providerId &&
      membership.status === "ACTIVE" &&
      (membership.role === "OWNER" || membership.role === "MANAGER"),
  );
}
