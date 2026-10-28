import type { ServiceDto } from "@/entities/service";

/** Описание короче этого клиенту мало что говорит — подсвечиваем карточку исполнителю. */
export const SHORT_DESCRIPTION_LENGTH = 100;

export type ServiceAttention = "no-photo" | "no-description" | "short-description";

/** Главная причина, по которой карточку стоит дополнить; null — карточка в порядке. */
export function serviceAttention(
  service: Pick<ServiceDto, "status" | "image" | "description">,
): ServiceAttention | null {
  if (service.status === "ARCHIVED") return null;
  if (!service.image) return "no-photo";
  const description = service.description?.trim() ?? "";
  if (!description) return "no-description";
  if (description.length < SHORT_DESCRIPTION_LENGTH) return "short-description";
  return null;
}

export function serviceAttentionLabel(attention: ServiceAttention) {
  if (attention === "no-photo") return "Нет фото";
  if (attention === "no-description") return "Нет описания";
  return "Короткое описание";
}
