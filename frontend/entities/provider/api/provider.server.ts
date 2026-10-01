import "server-only";

import { fetchBackendJson } from "@/shared/api/backend/server";
import { parsePublicProviderProfileDto, type PublicProviderProfileDto } from "@/entities/provider/dto/provider-public-profile.dto";

export async function getPublicProviderProfile(providerId: string): Promise<PublicProviderProfileDto | null> {
  const raw = await fetchBackendJson<unknown>(`/providers/${providerId}/public`).catch(() => null);
  if (!raw) return null;
  const { data } = parsePublicProviderProfileDto(raw);
  return data ?? null;
}

