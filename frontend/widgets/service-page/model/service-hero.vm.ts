export type ServiceHeroVm = {
  backHref: string;
  categoryLabel: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  imageBadgeLabel: string | null;
  cityLabel: string | null;
  rating: { value: number; reviewCount: number | null } | null;
  priceLabel: string;
  ctaAnchorHref: string;
  ctaText: string;
  benefits: readonly string[];
};

