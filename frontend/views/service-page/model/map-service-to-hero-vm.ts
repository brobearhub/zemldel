import type { ServiceDto } from "@/entities/service";
import type { ServiceHeroVm } from "@/widgets/service-page";

function normalizeText(value: string | null | undefined): string | null {
  const s = value?.trim() ?? "";
  return s.length ? s : null;
}

export function mapServiceToHeroVm(service: ServiceDto): ServiceHeroVm {
  const description = normalizeText(service.description) ?? null;

  return {
    backHref: service.categoryId ? `/service-categories/${service.categoryId}` : "/",
    categoryLabel: service.category?.name ?? "Услуга",
    title: service.title,
    description,
    imageUrl: service.image ?? null,
    imageBadgeLabel: normalizeText(service.stockBadge),
    places: service.places ?? [],
    rating:
      service.rating != null
        ? { value: service.rating, reviewCount: service.reviewCount ?? null }
        : null,
    priceLabel: service.price,
    ctaAnchorHref: "#consultation",
    ctaText: "Оставить заявку",
    benefits: [],
  };
}

