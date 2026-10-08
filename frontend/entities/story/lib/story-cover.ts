export type StoryCover =
  | { kind: "image"; src: string }
  | { kind: "initials" };

export function resolveStoryCover(story: {
  imageUrl: string | null;
  authorImageUrl: string | null;
}): StoryCover {
  if (story.imageUrl) return { kind: "image", src: story.imageUrl };
  if (story.authorImageUrl) return { kind: "image", src: story.authorImageUrl };
  return { kind: "initials" };
}

export function storyAuthorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((part) => part.length > 0);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toLocaleUpperCase("ru-RU");
  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toLocaleUpperCase("ru-RU");
}
