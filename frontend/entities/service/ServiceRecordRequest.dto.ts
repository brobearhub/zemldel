import type { ServiceIconKey, ServicePaletteColor } from "./types";

/**
 * Request DTO for creating/updating a provider-owned service from the frontend side.
 * This mirrors the BFF/backend payload shape (not the full hydrated `ServiceRecord`).
 */
export type ServiceRecordRequestDto = {
  categoryId?: string;
  templateId?: string | null;
  status?: "DRAFT" | "PUBLISHED";
  title?: string;
  price?: string;
  ctaText?: string;
  ctaHref?: string | null;
  image?: string | null;
  stockBadge?: string | null;
  description?: string | null;
  highlight?: string | null;
  badge?: string | null;
  paletteColor?: ServicePaletteColor | null;
  icon?: ServiceIconKey | null;
  rating?: number | null;
  reviewCount?: number | null;
};

