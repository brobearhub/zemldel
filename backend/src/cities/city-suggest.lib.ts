export function normalizeCityNameForKey(name: string) {
  return name.trim().toLowerCase();
}

/** ГАР пишет Волгоград как «город-герой Волгоград». В ответах API остаётся обиходное имя. */
export function publicCityName(name: string) {
  return name.trim().replace(/^город-герой\s+/iu, '');
}

export function publicCityNameOrNull(name: string | null | undefined) {
  if (!name?.trim()) return null;
  return publicCityName(name);
}

export function locationRowRank(row: { typeName: string; level: number }) {
  const t = row.typeName.trim().toLowerCase();

  // Some GAR types are technically "locations" but are rarely useful for users in UI.
  // Keep them searchable, but push them down in suggestions.
  const lowPriorityTypePenalty = t === 'автодорога' ? 50 : 0;

  // Prefer concrete city records over administrative shells.
  let base = 99;
  if (row.typeName === 'г' && row.level === 5) base = 0;
  else if (row.typeName === 'г' && row.level === 1)
    base = 1; // federal cities (subjects)
  else if (row.level === 6)
    base = 2; // locality / населённый пункт
  else if (row.level === 4)
    base = 3; // settlement
  else if (row.level === 3)
    base = 4; // municipal area / city district
  else if (row.level === 2) base = 5; // admin area

  return base + lowPriorityTypePenalty;
}

export function buildDisplayName(row: {
  name: string;
  typeName: string;
  regionName: string;
}) {
  const name = publicCityName(row.name);
  const region = row.regionName.trim();
  const type = row.typeName.trim();
  const prefix = type ? `${type} ` : '';

  const nameKey = normalizeCityNameForKey(name);
  const regionKey = normalizeCityNameForKey(region);
  if (regionKey.includes(nameKey)) return `${prefix}${name}`;
  return `${prefix}${name}, ${region}`;
}
