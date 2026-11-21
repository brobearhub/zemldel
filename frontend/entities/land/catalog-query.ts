import { pluralRu } from "@/shared/lib/plural-ru";

export const landFilterKeys = [
  "cityId",
  "cadastralNumbers",
  "q",
  "minPrice",
  "maxPrice",
  "minArea",
  "maxArea",
  "dealType",
  "purpose",
  "category",
  "vri",
  "boundaries",
  "buildings",
  "restrictions",
  "electricity",
  "gas",
  "water",
  "sewerage",
  "sellerRelation",
  "author",
  "rentMax",
  "rentPeriod",
  "leaseAfter",
] as const;

export type LandFilters = Partial<
  Record<(typeof landFilterKeys)[number], string>
>;
export type LandView = "list" | "tiles" | "map";

export function landView(params: URLSearchParams): LandView {
  if (params.get("kind") === "SELECTION") return "tiles";
  const view = params.get("view");
  if (view === "map" || view === "tiles") return view;
  return !view && params.get("map") === "1" ? "map" : "list";
}

export function appliedLandFilters(params: URLSearchParams) {
  const filters = new URLSearchParams();
  for (const key of landFilterKeys) {
    const value = params.get(key);
    if (value) filters.set(key, value);
  }
  return filters;
}

export function catalogRequest(params: URLSearchParams) {
  const query = appliedLandFilters(params);
  for (const key of ["kind", "bbox", "favorites", "sort", "page"]) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  if (landView(params) === "map") {
    query.set("map", "1");
    query.delete("page");
  }
  return "?" + query.toString();
}

export function mapFilterScope(path: string) {
  const params = new URLSearchParams(path);
  params.delete("bbox");
  return params.toString();
}

export const landOfferCount = (count: number) =>
  `${count} ${pluralRu(count, ["предложение", "предложения", "предложений"])}`;
