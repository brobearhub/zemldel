import "server-only";

import { fetchBackendJson, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import type { StoryListDto, StoryScope } from "@/entities/story/dto/story.dto";

export async function listPublicStories(cityId?: string | null): Promise<StoryListDto> {
  const qs = cityId ? `?cityId=${encodeURIComponent(cityId)}` : "";
  return fetchBackendJson<StoryListDto>(`/stories${qs}`);
}

export async function listMyStories(userId: string, scope: StoryScope): Promise<StoryListDto> {
  return fetchBackendJsonAsUser<StoryListDto>(`/stories/mine?scope=${scope}`, userId);
}
