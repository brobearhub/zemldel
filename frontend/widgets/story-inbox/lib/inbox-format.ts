import type { StoryConversationDto } from "@/entities/story";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function formatInboxPreview(text: string, mine: boolean): string {
  return mine ? `Вы: ${text}` : text;
}

export function formatInboxTime(iso: string, now: Date): string {
  const date = new Date(iso);
  const dayDiff = Math.round((startOfLocalDay(now) - startOfLocalDay(date)) / DAY_MS);
  if (dayDiff <= 0) {
    return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(date);
  }
  if (dayDiff === 1) return "вчера";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(date);
}

export function storyMarkerLabel(storyText: string): string {
  return `Ответ на историю «${storyText}»`;
}

export function withSentPreview(
  items: readonly StoryConversationDto[],
  conversationId: string,
  text: string,
  sentAt: string,
): StoryConversationDto[] {
  return items
    .map((item) =>
      item.id === conversationId
        ? { ...item, preview: formatInboxPreview(text, true), lastMessageAt: sentAt, unreadCount: 0 }
        : item,
    )
    .sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt));
}
