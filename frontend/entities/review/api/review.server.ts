import "server-only";

import { fetchBackendJson } from "@/shared/api/backend/server";
import type { ReviewListDto } from "@/entities/review/dto/review.dto";

export async function listPublicServiceReviews(serviceId: string): Promise<ReviewListDto> {
  return fetchBackendJson<ReviewListDto>(`/services/${serviceId}/reviews?limit=20`);
}

export async function listPublicProviderReviews(providerId: string): Promise<ReviewListDto> {
  return fetchBackendJson<ReviewListDto>(`/providers/${providerId}/reviews?limit=20`);
}
