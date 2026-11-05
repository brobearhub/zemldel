import "server-only";

import { BackendApiError, fetchBackendJson } from "@/shared/api/backend/server";
import { parsePublicProviderProfileDto, type PublicProviderProfileDto } from "@/entities/provider/dto/provider-public-profile.dto";

async function loadPublicProvider(path: string): Promise<PublicProviderProfileDto | null> {
  try {
    const raw = await fetchBackendJson<unknown>(path);
    const { data } = parsePublicProviderProfileDto(raw);
    if (!data) throw new Error("Invalid public provider response");
    return data;
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) return null;
    throw error;
  }
}

export function getPublicProviderBySlug(slug: string) {
  return loadPublicProvider(`/providers/by-slug/${encodeURIComponent(slug)}`);
}

export async function getPublicProviderProfile(providerId: string): Promise<PublicProviderProfileDto | null> {
  return loadPublicProvider(`/providers/${encodeURIComponent(providerId)}/public`);
}

