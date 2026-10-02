import type { ServiceDto } from "@/entities/service";
import type { ServiceHeroVm } from "@/widgets/service-page";

function normalizeText(value: string | null | undefined): string | null {
  const s = value?.trim() ?? "";
  return s.length ? s : null;
}

function splitBenefits(input: string | null): readonly string[] {
  if (!input) return [];
  // Allow either newline-separated or "•" separated list.
  const normalized = input
    .replace(/\r\n/g, "\n")
    .split(/\n|•/g)
    .map((s) => s.trim())
    .filter(Boolean);
  // Keep short to match layout.
  return normalized.slice(0, 3);
}

export function mapServiceToHeroVm(service: ServiceDto): ServiceHeroVm {
  const cityLabel = service.provider?.city?.name ?? null;
  const description = normalizeText(service.description) ?? null;
  const benefitsFromApi = splitBenefits(normalizeText(service.highlight));
  const benefits =
    benefitsFromApi.length > 0
      ? benefitsFromApi
      : [
          "Разберёмся в вашей задаче",
          "Предложим понятный план действий",
          "Сопроводим до результата",
        ];

  return {
    backHref: service.categoryId ? `/service-categories/${service.categoryId}` : "/",
    categoryLabel: service.category?.name ?? "Услуга",
    title: service.title,
    description,
    imageUrl: service.image ?? null,
    imageBadgeLabel: normalizeText(service.badge) ?? "Услуга под вашу задачу",
    cityLabel,
    rating:
      service.rating != null
        ? { value: service.rating, reviewCount: service.reviewCount ?? null }
        : null,
    priceLabel: service.price,
    ctaAnchorHref: "#consultation",
    ctaText: "ЗАДАТЬ ВОПРОС",
    benefits,
  };
}

