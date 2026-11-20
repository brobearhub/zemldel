// Приложение к приказу Росреестра от 10.11.2020 № П/0412, редакция с 15.09.2026.
// https://base.garant.ru/75062082/53f89421bbdaf741eb2d1ecc4ddb4c33/
import namesByCode from "./permitted-uses.json";

// Поисковые формулировки дополняют официальные названия в подсказках поиска.
const searchTerms: Record<string, string> = {
  "1.16": "лпх личное подсобное хозяйство полевой участок",
  "2.1": "ижс индивидуальное жилищное строительство",
  "2.2": "лпх личное подсобное хозяйство приусадебный участок",
  "13.1": "огородничество огородный участок",
  "13.2": "садоводство садовый участок",
};

function normalize(text: string) {
  return text.trim().toLowerCase().replaceAll("ё", "е").replace(/\s+/g, " ");
}

const entries = Object.entries(namesByCode).map(([code, name]) => ({
  code,
  name,
  searchText: normalize(`${name} ${searchTerms[code] ?? ""}`),
}));

const byNameOrCode = new Map<string, (typeof entries)[number]>();
for (const entry of entries) {
  byNameOrCode.set(entry.code, entry);
  byNameOrCode.set(normalize(entry.name), entry);
}

export function findPermittedUse(value: string) {
  return byNameOrCode.get(normalize(value));
}

function permittedUseKey(value: string) {
  return findPermittedUse(value)?.code ?? normalize(value);
}

export function mergePastedPermittedUses(selected: string[], lines: string[]) {
  const keys = new Set(selected.map(permittedUseKey));
  const next = [...selected];
  for (const line of lines) {
    const text = line.trim();
    const key = permittedUseKey(text);
    if (!key || keys.has(key)) continue;
    keys.add(key);
    next.push(findPermittedUse(text)?.name ?? text);
  }
  return next;
}

export type PermittedUseNode = {
  code: string;
  name: string;
  children: PermittedUseNode[];
};

function parentCode(code: string) {
  const parts = code.split(".");
  if (parts.length > 2) return parts.slice(0, -1).join(".");
  return parts[1] === "0" ? undefined : `${parts[0]}.0`;
}

export function permittedUseAncestors(values: string[]) {
  const ancestors = new Set<string>();
  for (const value of values) {
    const entry = findPermittedUse(value);
    let parent = entry && parentCode(entry.code);
    while (parent && !ancestors.has(parent)) {
      ancestors.add(parent);
      parent = parentCode(parent);
    }
  }
  return [...ancestors];
}

export function getPermittedUseTree(input: string) {
  const tokens = normalize(input).split(" ").filter(Boolean);
  const matches = entries.filter((entry) =>
    tokens.every((token) =>
      /^[\d.]+$/.test(token)
        ? entry.code.startsWith(token)
        : entry.searchText.includes(token),
    ),
  );
  const codes = matches.map((entry) => entry.code);
  const expanded = tokens.length ? permittedUseAncestors(codes) : [];
  const visible = new Set([...codes, ...expanded]);
  const nodes = new Map<string, PermittedUseNode>();
  for (const { code, name } of entries) {
    if (visible.has(code)) nodes.set(code, { code, name, children: [] });
  }
  const roots: PermittedUseNode[] = [];
  for (const node of nodes.values()) {
    const parent = parentCode(node.code);
    (parent ? nodes.get(parent)!.children : roots).push(node);
  }
  return { roots, expanded, visible };
}
