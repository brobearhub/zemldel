type RegionRule = {
  pattern: RegExp;
  format: (name: string) => string;
};

function appendKind(name: string, kind: string) {
  if (name.toLowerCase().includes(kind)) return name;
  return `${name} ${kind}`;
}

const REGION_RULES: readonly RegionRule[] = [
  {
    pattern: /^а\.?\s*обл\.?\s+/i,
    format: (name) => appendKind(name, "автономная область"),
  },
  {
    pattern: /^а\.?\s*окр\.?\s+/i,
    format: (name) => appendKind(name, "автономный округ"),
  },
  {
    pattern: /^обл\.?\s+/i,
    format: (name) => appendKind(name, "область"),
  },
  {
    pattern: /^край\.?\s+/i,
    format: (name) => appendKind(name, "край"),
  },
  {
    pattern: /^респ\.?\s+/i,
    format: (name) => (name.toLowerCase().startsWith("республика ") ? name : `Республика ${name}`),
  },
  {
    pattern: /^г\.?\s+/i,
    format: (name) => name,
  },
  {
    pattern: /^АО\s+/u,
    format: (name) => name,
  },
];

export function displayCityName(name: string) {
  return name.trim().replace(/^город-герой\s+/iu, "");
}

export function formatRegionLabel(regionName: string) {
  const region = regionName.trim();
  if (!region) return "";

  for (const rule of REGION_RULES) {
    const match = rule.pattern.exec(region);
    if (!match) continue;
    return rule.format(region.slice(match[0].length).trim());
  }

  return region;
}

export function shortRegionLabel(regionName: string) {
  const full = formatRegionLabel(regionName);
  return full
    .replace(/автономная область$/iu, "авт. обл.")
    .replace(/область$/iu, "обл.");
}

export function formatCityLabel(name: string, regionName: string) {
  const city = displayCityName(name);
  const region = formatRegionLabel(regionName);
  if (!city) return region;
  if (!region) return city;

  const cityKey = city.toLowerCase();
  const regionKey = region.toLowerCase();
  if (regionKey.includes(cityKey)) return city;
  return `${city}, ${region}`;
}
