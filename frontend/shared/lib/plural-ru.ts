type RuPluralForms = readonly [one: string, few: string, many: string];

/**
 * Why: русское склонение по числу — одна форма на 1, другая на 2–4, третья на остальные,
 * с исключениями для 11–14.
 */
export function pluralRu(count: number, forms: RuPluralForms): string {
  const n = Math.abs(Math.trunc(count));
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
