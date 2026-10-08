export type StoryMetricId = "live" | "saved";

export type StoryMetric = {
  id?: StoryMetricId;
  label: string;
  value: string;
  /** Карточка занимает всю ширину ряда. */
  wide?: boolean;
};

export function buildAuthorStoryMetrics(input: {
  liveCount: number;
  followerCount: number;
  unfollowCount: number;
  replyCount: number;
  savedCount: number;
}): StoryMetric[] {
  return [
    { id: "live", label: "Мои истории", value: String(input.liveCount), wide: true },
    { label: "Подписались", value: String(input.followerCount) },
    { label: "Отписались", value: String(input.unfollowCount) },
    { label: "Ответы", value: String(input.replyCount) },
    { id: "saved", label: "Сохраненные истории", value: String(input.savedCount) },
  ];
}
