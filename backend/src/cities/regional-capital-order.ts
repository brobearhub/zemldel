export type RegionalCapitalOrderRow = {
  featured: boolean;
  sortOrder: number;
  name: string;
};

export function compareRegionalCapitals(
  a: RegionalCapitalOrderRow,
  b: RegionalCapitalOrderRow,
) {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  if (a.featured && a.sortOrder !== b.sortOrder)
    return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name, 'ru');
}
