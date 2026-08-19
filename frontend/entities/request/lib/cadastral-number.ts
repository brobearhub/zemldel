export type CadastralNumberParts = [string, string, string, string];

export const CADASTRAL_PART_MAX_LENGTHS = [2, 2, 7, 10] as const;

export function createEmptyCadastralParts(): CadastralNumberParts {
  return ["", "", "", ""];
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function isCadastralPartsEmpty(parts: CadastralNumberParts): boolean {
  return parts.every((part) => part.trim().length === 0);
}

export function isCadastralPartsComplete(parts: CadastralNumberParts): boolean {
  return parts.every((part) => part.trim().length > 0);
}

export function isCadastralPartsPartial(parts: CadastralNumberParts): boolean {
  const filledCount = parts.filter((part) => part.trim().length > 0).length;
  return filledCount > 0 && filledCount < 4;
}

export function joinCadastralParts(parts: CadastralNumberParts): string | null {
  if (isCadastralPartsEmpty(parts)) return null;
  if (!isCadastralPartsComplete(parts)) return null;
  return parts.map((part) => part.trim()).join(":");
}

export function parseCadastralValue(value: string): CadastralNumberParts | null {
  const chunks = value.trim().split(":");
  if (chunks.length !== 4) return null;
  return [chunks[0], chunks[1], chunks[2], chunks[3]];
}

export function collectCadastralNumbersFromParts(rows: readonly CadastralNumberParts[]): {
  numbers: string[];
  partialError: string | null;
} {
  const numbers: string[] = [];
  for (const row of rows) {
    if (isCadastralPartsEmpty(row)) continue;
    if (isCadastralPartsPartial(row)) {
      return { numbers: [], partialError: "Заполните все 4 части кадастрового номера." };
    }
    const joined = joinCadastralParts(row);
    if (joined) numbers.push(joined);
  }
  return { numbers, partialError: null };
}
