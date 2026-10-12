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

const CADASTRAL_INPUT_MAX_DIGITS = CADASTRAL_PART_MAX_LENGTHS.reduce((sum, length) => sum + length, 0);

/** Одна строка `66:41:0204016:12`: двоеточия ставятся сами, лишние символы отбрасываются. */
export function formatCadastralInput(raw: string): string {
  const digits = digitsOnly(raw).slice(0, CADASTRAL_INPUT_MAX_DIGITS);
  const parts: string[] = [];
  let offset = 0;
  for (const length of CADASTRAL_PART_MAX_LENGTHS) {
    if (offset >= digits.length) break;
    parts.push(digits.slice(offset, offset + length));
    offset += length;
  }
  return parts.join(":");
}

export function cadastralPartsFromInput(raw: string): CadastralNumberParts {
  const chunks = formatCadastralInput(raw).split(":");
  return [chunks[0] ?? "", chunks[1] ?? "", chunks[2] ?? "", chunks[3] ?? ""];
}

export function formatCadastralParts(parts: CadastralNumberParts): string {
  if (isCadastralPartsEmpty(parts)) return "";
  let lastFilled = 0;
  for (let index = 0; index < parts.length; index += 1) {
    if (parts[index].length > 0) lastFilled = index;
  }
  return parts.slice(0, lastFilled + 1).join(":");
}

/** Позиция курсора после маски: `digitCount` — сколько цифр было слева от каретки. */
export function cadastralCaretFromDigitCount(formatted: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    const char = formatted[index] ?? "";
    if (char >= "0" && char <= "9") {
      seen += 1;
      if (seen === digitCount) return index + 1;
    }
  }
  return formatted.length;
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
