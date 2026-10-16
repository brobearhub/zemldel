export type ServiceCardItem = {
  id: string;
  title: string;
  /** ISO datetime when service was published (for sorting); null/undefined if unknown */
  publishedAt?: string | null;
  /** URL or path to image; if not set, placeholder is shown */
  image?: string | null;
  /** Label ribbon on the right edge of the photo, e.g. "Осталось 8 шт" */
  stockBadge?: string | null;
  /** Price or cost label, e.g. "1004 ₽" or "от 15 000 ₽" */
  price: string;
  provider: {
    id: string;
    name: string;
    city: {
      id: string;
      name: string;
      regionCode: string;
      regionName: string;
    } | null;
  };
  /** 1–5 */
  rating?: number | null;
  /** Review count for label "N отзыв(ов)" */
  reviewCount?: number | null;
  places?: Array<{
    kind: "city" | "region";
    cityId?: string;
    name: string;
    regionCode: string;
    regionName: string;
  }>;
  /** Theme palette key that paints the label ribbon. */
  paletteColor?: ServicePaletteColor | null;
};

export type ServiceCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number | null;
};

export type ServicePaletteColor =
  | "primary"
  | "secondary"
  | "info"
  | "success"
  | "warning"
  | "error";

/** Full service record — single source of truth for API and pages */
export type ServiceRecord = ServiceCardItem & {
  categoryId: string;
  category: ServiceCategory;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  /** For main services: full description (about page) */
  description?: string | null;
};
