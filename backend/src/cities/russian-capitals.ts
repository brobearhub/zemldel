import { locationRowRank } from './city-suggest.lib';

export type RegionalCapitalSeed = {
  readonly name: string;
  readonly regionCode: string;
  /** Имена объекта в ГАР, если город хранится как округ, а не под обиходным названием. */
  readonly aliases?: readonly string[];
};

/**
 * Административные центры субъектов РФ.
 * Московская область не дублируется: её центр — Москва (77).
 * Ленинградская область — Гатчина с 2023 года.
 */
export const RUSSIAN_CAPITALS: readonly RegionalCapitalSeed[] = [
  { name: 'Майкоп', regionCode: '01' },
  { name: 'Уфа', regionCode: '02' },
  { name: 'Улан-Удэ', regionCode: '03' },
  { name: 'Горно-Алтайск', regionCode: '04' },
  { name: 'Махачкала', regionCode: '05' },
  { name: 'Магас', regionCode: '06' },
  { name: 'Нальчик', regionCode: '07' },
  { name: 'Элиста', regionCode: '08' },
  { name: 'Черкесск', regionCode: '09', aliases: ['Черкесский'] },
  { name: 'Петрозаводск', regionCode: '10', aliases: ['Петрозаводский'] },
  { name: 'Сыктывкар', regionCode: '11' },
  { name: 'Йошкар-Ола', regionCode: '12' },
  { name: 'Саранск', regionCode: '13' },
  { name: 'Якутск', regionCode: '14' },
  { name: 'Владикавказ', regionCode: '15' },
  { name: 'Казань', regionCode: '16' },
  { name: 'Кызыл', regionCode: '17' },
  { name: 'Ижевск', regionCode: '18' },
  { name: 'Абакан', regionCode: '19' },
  { name: 'Грозный', regionCode: '20' },
  { name: 'Чебоксары', regionCode: '21' },
  { name: 'Барнаул', regionCode: '22' },
  { name: 'Краснодар', regionCode: '23' },
  { name: 'Красноярск', regionCode: '24' },
  { name: 'Владивосток', regionCode: '25', aliases: ['Владивостокский'] },
  { name: 'Ставрополь', regionCode: '26' },
  { name: 'Хабаровск', regionCode: '27' },
  { name: 'Благовещенск', regionCode: '28' },
  { name: 'Архангельск', regionCode: '29' },
  { name: 'Астрахань', regionCode: '30' },
  { name: 'Белгород', regionCode: '31' },
  { name: 'Брянск', regionCode: '32' },
  { name: 'Владимир', regionCode: '33' },
  { name: 'Волгоград', regionCode: '34', aliases: ['город-герой Волгоград'] },
  { name: 'Вологда', regionCode: '35' },
  { name: 'Воронеж', regionCode: '36' },
  { name: 'Иваново', regionCode: '37' },
  { name: 'Иркутск', regionCode: '38' },
  { name: 'Калининград', regionCode: '39' },
  { name: 'Калуга', regionCode: '40' },
  { name: 'Петропавловск-Камчатский', regionCode: '41' },
  { name: 'Кемерово', regionCode: '42', aliases: ['Кемеровский'] },
  { name: 'Киров', regionCode: '43' },
  { name: 'Кострома', regionCode: '44' },
  { name: 'Курган', regionCode: '45' },
  { name: 'Курск', regionCode: '46' },
  { name: 'Гатчина', regionCode: '47' },
  { name: 'Липецк', regionCode: '48' },
  { name: 'Магадан', regionCode: '49' },
  { name: 'Мурманск', regionCode: '51' },
  { name: 'Нижний Новгород', regionCode: '52' },
  { name: 'Великий Новгород', regionCode: '53' },
  { name: 'Новосибирск', regionCode: '54' },
  { name: 'Омск', regionCode: '55' },
  { name: 'Оренбург', regionCode: '56' },
  { name: 'Орёл', regionCode: '57' },
  { name: 'Пенза', regionCode: '58' },
  { name: 'Пермь', regionCode: '59' },
  { name: 'Псков', regionCode: '60' },
  { name: 'Ростов-на-Дону', regionCode: '61' },
  { name: 'Рязань', regionCode: '62' },
  { name: 'Самара', regionCode: '63' },
  { name: 'Саратов', regionCode: '64' },
  { name: 'Южно-Сахалинск', regionCode: '65' },
  { name: 'Екатеринбург', regionCode: '66' },
  { name: 'Смоленск', regionCode: '67' },
  { name: 'Тамбов', regionCode: '68' },
  { name: 'Тверь', regionCode: '69' },
  { name: 'Томск', regionCode: '70' },
  { name: 'Тула', regionCode: '71' },
  { name: 'Тюмень', regionCode: '72' },
  { name: 'Ульяновск', regionCode: '73' },
  { name: 'Челябинск', regionCode: '74' },
  { name: 'Чита', regionCode: '75' },
  { name: 'Ярославль', regionCode: '76' },
  { name: 'Москва', regionCode: '77' },
  { name: 'Санкт-Петербург', regionCode: '78' },
  { name: 'Биробиджан', regionCode: '79' },
  { name: 'Нарьян-Мар', regionCode: '83' },
  { name: 'Ханты-Мансийск', regionCode: '86' },
  { name: 'Анадырь', regionCode: '87' },
  { name: 'Салехард', regionCode: '89' },
  { name: 'Мелитополь', regionCode: '90' },
  { name: 'Симферополь', regionCode: '91' },
  { name: 'Севастополь', regionCode: '92' },
  { name: 'Донецк', regionCode: '93' },
  { name: 'Луганск', regionCode: '94' },
  { name: 'Геническ', regionCode: '95' },
];

/**
 * Первый эшелон окна «Локация».
 * Порядок здесь — порядок чипов и `sortOrder` в сиде столиц.
 */
export const FEATURED_REGIONAL_CAPITALS: readonly string[] = [
  'Москва',
  'Санкт-Петербург',
  'Новосибирск',
  'Екатеринбург',
  'Казань',
  'Красноярск',
  'Нижний Новгород',
  'Челябинск',
  'Уфа',
  'Самара',
  'Ростов-на-Дону',
  'Краснодар',
  'Омск',
  'Воронеж',
  'Пермь',
  'Волгоград',
  'Тюмень',
  'Хабаровск',
];

const FEDERAL_CITY_REGION_CODES = new Set(['77', '78', '92']);

export type CapitalCityCandidate = {
  id: string;
  name: string;
  typeName: string;
  level: number;
  regionCode: string;
  regionName: string;
};

function foldCityName(name: string) {
  return name.trim().toLowerCase().replaceAll('ё', 'е');
}

function foldRegionCode(code: string) {
  const trimmed = code.trim();
  if (/^\d+$/.test(trimmed)) return trimmed.padStart(2, '0');
  return trimmed;
}

function capitalRank(row: CapitalCityCandidate, regionCode: string) {
  const type = row.typeName.trim().toLowerCase();
  // В ГАР часть столиц есть только как городской округ (`г.о.`), без отдельной записи `г`.
  if (
    FEDERAL_CITY_REGION_CODES.has(foldRegionCode(regionCode)) &&
    type === 'г' &&
    row.level === 1
  ) {
    return 0;
  }
  if (type === 'г' && row.level === 5) return 1;
  if (type === 'г' && row.level === 1) return 2;
  if (type === 'г.о.' || type === 'г.о' || type === 'го') return 3;
  if (type === 'г' || type === 'г.') return 4;
  return 100 + locationRowRank(row);
}

function capitalNameKeys(capital: RegionalCapitalSeed) {
  return new Set(
    [capital.name, ...(capital.aliases ?? [])].map((name) =>
      foldCityName(name),
    ),
  );
}

function bestCapitalMatch<T extends CapitalCityCandidate>(
  capital: RegionalCapitalSeed,
  rows: readonly T[],
): T | null {
  const nameKeys = capitalNameKeys(capital);
  const regionKey = foldRegionCode(capital.regionCode);
  const matches = rows.filter(
    (row) =>
      nameKeys.has(foldCityName(row.name)) &&
      foldRegionCode(row.regionCode) === regionKey,
  );
  if (matches.length === 0) return null;
  return matches.reduce((prev, row) =>
    capitalRank(row, capital.regionCode) < capitalRank(prev, capital.regionCode)
      ? row
      : prev,
  );
}

export function regionalCapitalSearchNames(capital: RegionalCapitalSeed) {
  return [
    ...new Set(
      [capital.name, ...(capital.aliases ?? [])].flatMap((name) => [
        name,
        name.replaceAll('ё', 'е'),
      ]),
    ),
  ];
}

export function pickRegionalCapitalCities<T extends CapitalCityCandidate>(
  rows: readonly T[],
): T[] {
  const picked: T[] = [];
  for (const capital of RUSSIAN_CAPITALS) {
    const best = bestCapitalMatch(capital, rows);
    if (best) picked.push(best);
  }
  return picked;
}

export function missingRegionalCapitals(
  rows: readonly CapitalCityCandidate[],
): RegionalCapitalSeed[] {
  return RUSSIAN_CAPITALS.filter((capital) => !bestCapitalMatch(capital, rows));
}

export function featuredRegionalCapitalIds(
  rows: readonly CapitalCityCandidate[],
): { cityId: string; sortOrder: number }[] {
  const byName = new Map(
    RUSSIAN_CAPITALS.map((capital) => [foldCityName(capital.name), capital]),
  );
  const assigned: { cityId: string; sortOrder: number }[] = [];
  FEATURED_REGIONAL_CAPITALS.forEach((name, sortOrder) => {
    const capital = byName.get(foldCityName(name));
    if (!capital) return;
    const best = bestCapitalMatch(capital, rows);
    if (!best) return;
    assigned.push({ cityId: best.id, sortOrder });
  });
  return assigned;
}

export function capitalIdsToInsert(
  pickedIds: readonly string[],
  existingIds: readonly string[],
): string[] {
  const existing = new Set(existingIds);
  return pickedIds.filter((id) => !existing.has(id));
}
