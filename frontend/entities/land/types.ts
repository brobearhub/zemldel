import type { ServicePlace } from "@/entities/service";
import type { CitySuggestItemDto } from "@/entities/city";
import { pluralRu } from "@/shared/lib/plural-ru";
export const MAX_LAND_SHARE_PARTS = 200;
export type LandKind = "SALE" | "SELECTION";
export type LandDeal = "WHOLE" | "SHARE" | "LEASE_ASSIGNMENT";
export type LandStatus =
  | "DRAFT"
  | "PENDING"
  | "CHANGES_REQUIRED"
  | "PUBLISHED"
  | "WITHDRAWN";
export type LandDetails = {
  requestDocumentReview?: boolean;
  boundaries?: string;
  electricity?: string;
  gas?: string;
  water?: string;
  sewerage?: string;
  powerKw?: number | null;
  access?: string;
  buildings?: string;
  buildingsDescription?: string;
  restrictions?: string;
  restrictionsDescription?: string;
  negotiable?: boolean;
  included?: string;
  shareNumerator?: number | null;
  shareDenominator?: number | null;
  useAgreement?: string;
  coOwnerNotice?: string;
  rentRubles?: number | null;
  rentPeriod?: string;
  leaseIndefinite?: boolean;
  leaseUntil?: string;
  landlord?: string;
  transferConditions?: string;
  landlordConsent?: string;
  extraPayments?: string;
  arrears?: string;
  priceMode?: string;
  priceUnit?: string;
  scope?: string;
  result?: string;
  timeline?: string;
  allRussia?: boolean;
  places?: Array<{
    kind: "city" | "region";
    cityId?: string;
    regionCode?: string;
  }>;
};
export type LandDraft = {
  cityId: string | null;
  kind: LandKind;
  providerId: string | null;
  title: string;
  description: string;
  cadastralNumber: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  category: string;
  permittedUses: string[];
  purposes: string[];
  sellerRelation: string;
  dealType: LandDeal;
  areaM2: number | null;
  priceRubles: number | null;
  phone: string;
  showPhone: boolean;
  details: LandDetails;
};
export type LandPhoto = { id: string; url: string; filename: string };
export type LandListing = LandDraft & {
  city: CitySuggestItemDto | null;
  id: string;
  version: number;
  status: LandStatus;
  hasPublishedVersion?: boolean;
  canManage?: boolean;
  favorite?: boolean;
  authorUserId?: string;
  authorName: string;
  provider: {
    id: string;
    name: string;
    slug: string;
    image: string | null;
  } | null;
  serviceId: string | null;
  places: ServicePlace[];
  photos: LandPhoto[];
  documentCount: number;
  documents?: Array<LandPhoto & { size: number }>;
  documentStatus: "NOT_REQUESTED" | "REQUESTED" | "VERIFIED" | "REJECTED";
  documentReviewScope: string | null;
  documentReviewedAt: string | null;
  moderationReason?: string | null;
  withdrawalReason?: string | null;
  publishedAt: string | null;
  updatedAt: string;
};
export type LandMarker = {
  label?: string;
  cadastralNumber: string;
  latitude: number;
  longitude: number;
  listingIds: string[];
};
export type LandCatalogResult = {
  city: CitySuggestItemDto | null;
  items: LandListing[];
  total: number;
  page: number;
  pages: number;
  truncated: boolean;
  markers: LandMarker[];
  favoriteIds: string[];
};
export const DEAL_LABELS: Record<LandDeal, string> = {
  WHOLE: "Участок целиком",
  SHARE: "Продажа доли",
  LEASE_ASSIGNMENT: "Уступка аренды",
};
export const CATEGORY_LABELS: Record<string, string> = {
  SETTLEMENT: "Земли населённых пунктов",
  AGRICULTURE: "Земли сельскохозяйственного назначения",
  INDUSTRY: "Земли промышленности и иного специального назначения",
  PROTECTED: "Земли особо охраняемых территорий и объектов",
  FOREST: "Земли лесного фонда",
  WATER: "Земли водного фонда",
  RESERVE: "Земли запаса",
};
export const PURPOSE_LABELS: Record<string, string> = {
  HOME: "Для дома",
  DACHA: "Для дачи",
  FARM: "Сельское хозяйство",
  BUSINESS: "Для бизнеса",
  INVESTMENT: "Инвестиции",
};
export const STATUS_LABELS: Record<LandStatus, string> = {
  DRAFT: "Черновик",
  PENDING: "На модерации",
  CHANGES_REQUIRED: "Нужна правка",
  PUBLISHED: "Опубликовано",
  WITHDRAWN: "Снято",
};
export function landStatusLabel(row: Pick<LandListing, "status" | "hasPublishedVersion">) {
  if (row.hasPublishedVersion) {
    if (row.status === "DRAFT") return "Черновик изменений";
    if (row.status === "PENDING") return "Изменения на модерации";
    if (row.status === "CHANGES_REQUIRED") return "Изменения возвращены на доработку";
  }
  return STATUS_LABELS[row.status];
}
export const RELATION_LABELS: Record<string, string> = {
  OWNER: "Собственник",
  REPRESENTATIVE: "Представитель",
  TENANT: "Арендатор",
};
export const FACT_LABELS: Record<string, string> = {
  UNKNOWN: "Неизвестно",
  YES: "Да, по данным автора",
  NO: "Нет, по данным автора",
};
export const UTILITY_LABELS: Record<string, string> = {
  UNKNOWN: "Неизвестно",
  CONNECTED: "Подключено",
  NEARBY: "Рядом, не подключено",
  NONE: "Отсутствует",
};
export const RENT_PERIODS: Record<string, string> = {
  MONTH: "месяц",
  QUARTER: "квартал",
  YEAR: "год",
};
export const formatMoney = (n: number | null) =>
  n == null
    ? "Цена не указана"
    : `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(n)} ₽`;
export function sotkaLabel(sotkas: number) {
  return Number.isInteger(sotkas)
    ? pluralRu(sotkas, ["сотка", "сотки", "соток"])
    : "сотки";
}
export function formatArea(squareMeters: number | null) {
  if (squareMeters == null) return "Площадь не указана";
  const sotkas = Math.round(squareMeters) / 100;
  return `${sotkas.toLocaleString("ru-RU")} ${sotkaLabel(sotkas)}`;
}
export function landAddress(row: Pick<LandListing, "address" | "city">) {
  const city = row.city?.name;
  if (!city || row.address.toLowerCase().includes(city.toLowerCase()))
    return row.address;
  return [city, row.address].filter(Boolean).join(", ");
}
export function landPriceCaption(row: LandDraft) {
  if (row.kind === "SELECTION")
    return row.details.priceUnit
      ? `За ${row.details.priceUnit}`
      : "Объём и условия — в описании";
  if (row.dealType === "SHARE")
    return `Цена за ${row.details.shareNumerator ?? "?"}/${row.details.shareDenominator ?? "?"} доли в праве`;
  if (row.dealType === "LEASE_ASSIGNMENT")
    return `За уступку + ${formatMoney(row.details.rentRubles ?? null)} / ${RENT_PERIODS[row.details.rentPeriod ?? "MONTH"]} аренда`;
  return row.priceRubles != null && row.areaM2
    ? `${formatMoney(row.priceRubles / (row.areaM2 / 100))} за сотку`
    : "Полная стоимость участка";
}
export function landPrice(row: LandDraft) {
  return row.kind === "SELECTION" && row.details.priceMode === "AGREEMENT"
    ? "По договорённости"
    : `${row.kind === "SELECTION" && row.details.priceMode === "FROM" ? "от " : ""}${formatMoney(row.priceRubles)}`;
}
export const emptyLandDraft = (): LandDraft => ({
  cityId: null,
  kind: "SALE",
  providerId: null,
  title: "",
  description: "",
  cadastralNumber: "",
  address: "",
  latitude: null,
  longitude: null,
  category: "",
  permittedUses: [],
  purposes: [],
  sellerRelation: "OWNER",
  dealType: "WHOLE",
  areaM2: null,
  priceRubles: null,
  phone: "",
  showPhone: false,
  details: { priceMode: "AGREEMENT", rentPeriod: "MONTH" },
});
