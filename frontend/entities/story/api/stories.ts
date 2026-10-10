import type {
  StoryAudienceDto,
  StoryCommentDto,
  StoryCommentListDto,
  StoryConversationListDto,
  StoryConversationMessageDto,
  StoryConversationMessagesDto,
  StoryDto,
  StoryInsightsDto,
  StoryListDto,
  StoryReplyMessageDto,
  StoryReplyMessagesDto,
  StoryScope,
} from "@/entities/story/dto/story.dto";

async function parseJson<T>(res: Response, fallbackMessage: string): Promise<T> {
  const payload = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && payload && "message" in payload && typeof (payload as { message?: unknown }).message === "string"
        ? (payload as { message: string }).message
        : payload && typeof payload === "object" && payload && "error" in payload && typeof (payload as { error?: unknown }).error === "string"
          ? (payload as { error: string }).error
          : fallbackMessage;
    throw new Error(message);
  }
  return payload as T;
}

function scopeSuffix(scope: StoryScope | undefined, params = new URLSearchParams()): string {
  if (scope === "provider") params.set("scope", "provider");
  const text = params.toString();
  return text ? `?${text}` : "";
}

export async function fetchPublicStories(query?: {
  cityId?: string | null;
  providerId?: string | null;
  scope?: StoryScope;
}): Promise<StoryListDto> {
  const qs = new URLSearchParams();
  if (query?.providerId) qs.set("providerId", query.providerId);
  else if (query?.cityId) qs.set("cityId", query.cityId);
  if (query?.scope === "provider") qs.set("scope", "provider");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(`/api/stories${suffix}`, { cache: "no-store" });
  return parseJson<StoryListDto>(res, "Не удалось загрузить истории");
}

export async function fetchMyStories(scope: StoryScope): Promise<StoryListDto> {
  const res = await fetch(`/api/stories/mine?scope=${scope}`, { cache: "no-store" });
  return parseJson<StoryListDto>(res, "Не удалось загрузить ваши истории");
}

export async function createStory(input: {
  scope: StoryScope;
  text: string;
  durationDays: number;
  file?: File | null;
}): Promise<StoryDto> {
  const form = new FormData();
  form.append("text", input.text);
  form.append("durationDays", String(input.durationDays));
  form.append("scope", input.scope);
  if (input.file) form.append("file", input.file);
  const res = await fetch("/api/stories", { method: "POST", body: form });
  return parseJson<StoryDto>(res, "Не удалось опубликовать историю");
}

export async function deleteStory(storyId: string): Promise<void> {
  const res = await fetch(`/api/stories/${storyId}`, { method: "DELETE" });
  await parseJson<{ ok: boolean }>(res, "Не удалось убрать историю из показа");
}

export async function fetchSavedStories(scope: StoryScope = "user"): Promise<StoryListDto> {
  const res = await fetch(`/api/stories/saved${scopeSuffix(scope)}`, { cache: "no-store" });
  return parseJson<StoryListDto>(res, "Не удалось загрузить сохранённые истории");
}

export async function recordStoryView(storyId: string, scope: StoryScope = "user"): Promise<void> {
  const res = await fetch(`/api/stories/${storyId}/view${scopeSuffix(scope)}`, { method: "POST" });
  await parseJson(res, "Не удалось отметить просмотр");
}

export async function saveStory(storyId: string, scope: StoryScope = "user"): Promise<void> {
  const res = await fetch(`/api/stories/${storyId}/save${scopeSuffix(scope)}`, { method: "POST" });
  await parseJson(res, "Не удалось сохранить историю");
}

export async function unsaveStory(storyId: string, scope: StoryScope = "user"): Promise<void> {
  const res = await fetch(`/api/stories/${storyId}/save${scopeSuffix(scope)}`, { method: "DELETE" });
  await parseJson(res, "Не удалось убрать закладку");
}

export async function followStoryAuthor(target: {
  targetUserId?: string;
  targetProviderId?: string;
  scope?: StoryScope;
}): Promise<void> {
  const res = await fetch("/api/stories/follow", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(target),
  });
  await parseJson(res, "Не удалось подписаться");
}

export async function unfollowStoryAuthor(target: {
  targetUserId?: string;
  targetProviderId?: string;
  scope?: StoryScope;
}): Promise<void> {
  const res = await fetch("/api/stories/unfollow", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(target),
  });
  await parseJson(res, "Не удалось отписаться");
}

export async function replyToStory(storyId: string, text: string, scope: StoryScope = "user"): Promise<void> {
  const res = await fetch(`/api/stories/${storyId}/reply${scopeSuffix(scope)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  await parseJson(res, "Не удалось отправить ответ");
}

export async function recordStoryProfileOpen(storyId: string, scope: StoryScope = "user"): Promise<void> {
  const res = await fetch(`/api/stories/${storyId}/profile-open${scopeSuffix(scope)}`, { method: "POST" });
  await parseJson(res, "Не удалось открыть профиль");
}

export async function fetchStoryComments(storyId: string, scope: StoryScope = "user"): Promise<StoryCommentListDto> {
  const res = await fetch(`/api/stories/${storyId}/comments${scopeSuffix(scope)}`, { cache: "no-store" });
  return parseJson<StoryCommentListDto>(res, "Не удалось загрузить комментарии");
}

export async function commentOnStory(storyId: string, text: string, scope: StoryScope = "user"): Promise<StoryCommentDto> {
  const res = await fetch(`/api/stories/${storyId}/comments${scopeSuffix(scope)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return parseJson<StoryCommentDto>(res, "Не удалось отправить комментарий");
}

export async function updateStoryComment(storyId: string, commentId: string, text: string): Promise<StoryCommentDto> {
  const res = await fetch(`/api/stories/${storyId}/comments/${commentId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return parseJson<StoryCommentDto>(res, "Не удалось изменить комментарий");
}

export async function deleteStoryComment(storyId: string, commentId: string): Promise<void> {
  const res = await fetch(`/api/stories/${storyId}/comments/${commentId}`, { method: "DELETE" });
  await parseJson(res, "Не удалось удалить комментарий");
}

export async function likeStoryComment(storyId: string, commentId: string): Promise<void> {
  const res = await fetch(`/api/stories/${storyId}/comments/${commentId}/like`, { method: "POST" });
  await parseJson(res, "Не удалось поставить отметку");
}

export async function unlikeStoryComment(storyId: string, commentId: string): Promise<void> {
  const res = await fetch(`/api/stories/${storyId}/comments/${commentId}/like`, { method: "DELETE" });
  await parseJson(res, "Не удалось убрать отметку");
}

export async function fetchStoryReplyMessages(storyId: string, replyId: string): Promise<StoryReplyMessagesDto> {
  const res = await fetch(`/api/stories/${storyId}/replies/${replyId}/messages`, { cache: "no-store" });
  return parseJson<StoryReplyMessagesDto>(res, "Не удалось загрузить переписку");
}

export async function sendStoryReplyMessage(storyId: string, replyId: string, text: string): Promise<StoryReplyMessageDto> {
  const res = await fetch(`/api/stories/${storyId}/replies/${replyId}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return parseJson<StoryReplyMessageDto>(res, "Не удалось отправить сообщение");
}

export async function fetchStoryInsights(storyId: string, timeZone: string): Promise<StoryInsightsDto> {
  const qs = `?timeZone=${encodeURIComponent(timeZone)}`;
  const res = await fetch(`/api/stories/${storyId}/insights${qs}`, { cache: "no-store" });
  return parseJson<StoryInsightsDto>(res, "Не удалось загрузить статистику");
}

export async function fetchStoryAudience(scope: StoryScope): Promise<StoryAudienceDto> {
  const res = await fetch(`/api/stories/audience?scope=${scope}`, { cache: "no-store" });
  return parseJson<StoryAudienceDto>(res, "Не удалось загрузить подписки");
}

export async function fetchStoryConversations(scope: StoryScope): Promise<StoryConversationListDto> {
  const res = await fetch(`/api/stories/conversations?scope=${scope}`, { cache: "no-store" });
  return parseJson<StoryConversationListDto>(res, "Не удалось загрузить переписку");
}

export async function fetchStoryConversationMessages(
  scope: StoryScope,
  conversationId: string,
): Promise<StoryConversationMessagesDto> {
  const res = await fetch(
    `/api/stories/conversations/${encodeURIComponent(conversationId)}/messages?scope=${scope}`,
    { cache: "no-store" },
  );
  return parseJson<StoryConversationMessagesDto>(res, "Не удалось загрузить переписку");
}

export async function sendStoryConversationMessage(
  scope: StoryScope,
  conversationId: string,
  text: string,
): Promise<StoryConversationMessageDto> {
  const res = await fetch(
    `/api/stories/conversations/${encodeURIComponent(conversationId)}/messages?scope=${scope}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    },
  );
  return parseJson<StoryConversationMessageDto>(res, "Не удалось отправить сообщение");
}
