import { BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { CADASTRAL_NUMBER } from '../common/cadastral-number';

export const LAND_CATEGORIES = [
  'SETTLEMENT',
  'AGRICULTURE',
  'INDUSTRY',
  'PROTECTED',
  'FOREST',
  'WATER',
  'RESERVE',
] as const;
export const LAND_PURPOSES = [
  'HOME',
  'DACHA',
  'FARM',
  'BUSINESS',
  'INVESTMENT',
] as const;
export const DEAL_TYPES = ['WHOLE', 'SHARE', 'LEASE_ASSIGNMENT'] as const;
const MAX_LAND_SHARE_PARTS = 200;
export const FACT_STATES = ['UNKNOWN', 'YES', 'NO'] as const;
export const UTILITY_STATES = [
  'UNKNOWN',
  'CONNECTED',
  'NEARBY',
  'NONE',
] as const;
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
    kind: 'city' | 'region';
    cityId?: string;
    regionCode?: string;
  }>;
};
export type LandDraft = {
  cityId: string | null;
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
  dealType: (typeof DEAL_TYPES)[number];
  areaM2: number | null;
  priceRubles: number | null;
  phone: string;
  showPhone: boolean;
  details: LandDetails;
};
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('Ожидается объект');
  return value as Record<string, unknown>;
}
export function invalid(field: string, message: string): never {
  throw new BadRequestException({ message, fields: { [field]: message } });
}
function str(value: unknown, field: string, max = 5000) {
  if (value == null) return '';
  if (typeof value !== 'string' || value.length > max)
    invalid(
      field,
      `Поле слишком длинное или имеет неверный формат (до ${max} символов)`,
    );
  return value.trim();
}
function choice(
  value: unknown,
  field: string,
  options: readonly string[],
  fallback: string,
) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string' || !options.includes(value))
    invalid(field, 'Выберите значение из списка');
  return value;
}
function number(
  value: unknown,
  field: string,
  min = 0,
  max = 1e12,
  error = 'Укажите допустимое число',
): number | null {
  if (value == null || value === '') return null;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    invalid(field, error);
  return Math.round(value * 100) / 100;
}
function coordinate(value: unknown, field: string, max: number) {
  if (value == null || value === '') return null;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    Math.abs(value) > max
  )
    invalid(field, 'Некорректная координата');
  return value;
}
function bool(value: unknown, field: string) {
  if (value == null) return false;
  if (typeof value !== 'boolean') invalid(field, 'Ожидается да или нет');
  return value;
}
function strings(value: unknown, field: string, options?: readonly string[]) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 20)
    invalid(field, 'Не более 20 значений');
  return [
    ...new Set(
      value
        .map((v) =>
          options ? choice(v, field, options, '') : str(v, field, 300),
        )
        .filter(Boolean),
    ),
  ];
}
export function readLandDraft(
  raw: unknown,
  kind: 'SALE' | 'SELECTION',
  source: 'input' | 'stored' = 'input',
): LandDraft {
  const b = object(raw);
  const d = b.details == null ? {} : object(b.details);
  const dealType = choice(
    b.dealType,
    'dealType',
    DEAL_TYPES,
    'WHOLE',
  ) as LandDraft['dealType'];
  const details: LandDetails = {};
  if (kind === 'SALE') {
    if (d.requestDocumentReview !== undefined)
      details.requestDocumentReview = bool(
        d.requestDocumentReview,
        'requestDocumentReview',
      );
    for (const key of ['boundaries', 'buildings', 'restrictions'] as const)
      details[key] = choice(d[key], key, FACT_STATES, 'UNKNOWN');
    for (const key of ['electricity', 'gas', 'water', 'sewerage'] as const)
      details[key] = choice(d[key], key, UTILITY_STATES, 'UNKNOWN');
    for (const key of [
      'access',
      'buildingsDescription',
      'restrictionsDescription',
      'included',
    ] as const)
      details[key] = str(d[key], key, 2000);
    details.powerKw = number(d.powerKw, 'powerKw', 0, 1000000);
    details.negotiable = bool(d.negotiable, 'negotiable');
    if (dealType === 'SHARE') {
      // Previously saved fractions still need to be displayed and edited.
      const maxParts =
        source === 'stored' ? 1_000_000_000 : MAX_LAND_SHARE_PARTS;
      details.shareNumerator = number(
        d.shareNumerator,
        'shareNumerator',
        1,
        maxParts,
        `Укажите количество долей от 1 до ${maxParts}.`,
      );
      details.shareDenominator = number(
        d.shareDenominator,
        'shareDenominator',
        2,
        maxParts,
        `Укажите общее количество долей от 2 до ${maxParts}.`,
      );
      for (const key of ['useAgreement', 'coOwnerNotice'] as const)
        details[key] = str(d[key], key, 2000);
    }
    if (dealType === 'LEASE_ASSIGNMENT') {
      details.rentRubles = number(d.rentRubles, 'rentRubles');
      details.rentPeriod = choice(
        d.rentPeriod,
        'rentPeriod',
        ['MONTH', 'QUARTER', 'YEAR'],
        'MONTH',
      );
      details.leaseIndefinite = bool(d.leaseIndefinite, 'leaseIndefinite');
      details.leaseUntil = details.leaseIndefinite
        ? ''
        : str(d.leaseUntil, 'leaseUntil', 10);
      if (
        details.leaseUntil &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(details.leaseUntil) ||
          !Number.isFinite(Date.parse(details.leaseUntil)) ||
          (Number.isFinite(Date.parse(details.leaseUntil)) &&
            new Date(details.leaseUntil).toISOString().slice(0, 10) !==
              details.leaseUntil))
      )
        invalid('leaseUntil', 'Укажите дату окончания договора');
      for (const key of [
        'landlord',
        'transferConditions',
        'landlordConsent',
        'extraPayments',
        'arrears',
      ] as const)
        details[key] = str(d[key], key, 2000);
    }
  } else {
    details.priceMode = choice(
      d.priceMode,
      'priceMode',
      ['FIXED', 'FROM', 'AGREEMENT'],
      'AGREEMENT',
    );
    for (const key of ['priceUnit', 'scope', 'result', 'timeline'] as const)
      details[key] = str(
        d[key],
        key,
        key === 'scope' || key === 'result' ? 3000 : 200,
      );
    details.allRussia = bool(d.allRussia, 'allRussia');
    if (d.places != null && (!Array.isArray(d.places) || d.places.length > 100))
      invalid('places', 'Некорректная география');
    details.places = ((d.places as unknown[] | undefined) ?? []).map((p) => {
      const place = object(p);
      const kind = choice(place.kind, 'places', ['city', 'region'], '') as
        | 'city'
        | 'region';
      if (kind === 'city') {
        if (typeof place.cityId !== 'string' || !isUUID(place.cityId))
          invalid('places', 'Выберите город из справочника');
        return { kind, cityId: place.cityId };
      }
      const regionCode = str(place.regionCode, 'places', 20);
      if (!regionCode) invalid('places', 'Выберите регион');
      return { kind, regionCode };
    });
  }
  const cadastralNumber =
    kind === 'SALE' ? str(b.cadastralNumber, 'cadastralNumber', 40) : '';
  if (cadastralNumber && !CADASTRAL_NUMBER.test(cadastralNumber))
    invalid(
      'cadastralNumber',
      'Формат: 66:41:0000000:123. Номер не подтверждает права на участок.',
    );
  const cityId = kind === 'SALE' && b.cityId != null ? b.cityId : null;
  if (cityId !== null && (typeof cityId !== 'string' || !isUUID(cityId)))
    invalid('cityId', 'Выберите город из справочника');
  return {
    cityId,
    title: str(b.title, 'title', 160),
    description: str(b.description, 'description', 10000),
    cadastralNumber,
    address: str(b.address, 'address', 500),
    latitude: coordinate(b.latitude, 'latitude', 85),
    longitude: coordinate(b.longitude, 'longitude', 180),
    category: choice(b.category, 'category', LAND_CATEGORIES, ''),
    permittedUses: strings(b.permittedUses, 'permittedUses'),
    purposes: strings(b.purposes, 'purposes', LAND_PURPOSES),
    sellerRelation: choice(
      b.sellerRelation,
      'sellerRelation',
      ['OWNER', 'REPRESENTATIVE', 'TENANT'],
      'OWNER',
    ),
    dealType,
    areaM2: number(b.areaM2, 'areaM2'),
    priceRubles:
      kind === 'SELECTION' && details.priceMode === 'AGREEMENT'
        ? null
        : number(b.priceRubles, 'priceRubles'),
    phone: str(b.phone, 'phone', 40),
    showPhone: bool(b.showPhone, 'showPhone'),
    details,
  };
}
export function publicationErrors(
  d: LandDraft,
  kind: 'SALE' | 'SELECTION',
  now = new Date(),
) {
  const errors: Record<string, string> = {};
  const need = (field: string, ok: unknown, message: string) => {
    if (!ok) errors[field] = message;
  };
  need('title', d.title.length >= 5, 'Добавьте название (от 5 символов)');
  need(
    'description',
    d.description.length >= 30,
    'Опишите предложение (от 30 символов)',
  );
  if (d.showPhone)
    need(
      'phone',
      /^\+?[\d\s()-]{10,25}$/.test(d.phone),
      'Укажите телефон или отключите его показ',
    );
  const x = d.details;
  if (kind === 'SALE') {
    need(
      'cadastralNumber',
      d.cadastralNumber,
      'Кадастровый номер обязателен для публикации',
    );
    need('address', d.address, 'Укажите местоположение');
    need(
      'latitude',
      d.latitude != null && d.longitude != null,
      'Укажите точку на карте',
    );
    need('category', d.category, 'Укажите категорию земли по документам');
    need('permittedUses', d.permittedUses.length, 'Укажите ВРИ по документам');
    need(
      'areaM2',
      d.areaM2 != null && d.areaM2 > 0,
      'Укажите площадь всего участка',
    );
    need(
      'priceRubles',
      d.priceRubles != null &&
        (d.dealType === 'LEASE_ASSIGNMENT' || d.priceRubles > 0),
      'Укажите стоимость предложения',
    );
    if (x.buildings === 'YES')
      need(
        'buildingsDescription',
        x.buildingsDescription,
        'Опишите постройки и состав передачи',
      );
    if (x.restrictions === 'YES')
      need(
        'restrictionsDescription',
        x.restrictionsDescription,
        'Опишите известные ограничения',
      );
    if (d.dealType === 'SHARE') {
      need(
        'shareDenominator',
        (x.shareDenominator ?? 0) <= MAX_LAND_SHARE_PARTS,
        `Можно указать не больше ${MAX_LAND_SHARE_PARTS} долей.`,
      );
      need(
        'shareNumerator',
        Number.isInteger(x.shareNumerator) &&
          Number.isInteger(x.shareDenominator) &&
          Number(x.shareNumerator) > 0 &&
          Number(x.shareNumerator) < Number(x.shareDenominator),
        'Доля должна быть правильной дробью: например 1/2',
      );
      need(
        'useAgreement',
        x.useAgreement,
        'Укажите порядок пользования или «Неизвестно»',
      );
      need(
        'coOwnerNotice',
        x.coOwnerNotice,
        'Укажите сведения об уведомлении сособственников или «Неизвестно»',
      );
    }
    if (d.dealType === 'LEASE_ASSIGNMENT') {
      need(
        'rentRubles',
        x.rentRubles != null,
        'Укажите отдельную арендную плату',
      );
      need(
        'leaseUntil',
        x.leaseIndefinite ||
          (x.leaseUntil && x.leaseUntil > now.toISOString().slice(0, 10)),
        'Укажите будущую дату окончания или неопределённый срок',
      );
      for (const key of [
        'landlord',
        'transferConditions',
        'landlordConsent',
        'extraPayments',
        'arrears',
      ] as const)
        need(
          key,
          x[key],
          'Заполните условие; если сведений нет, укажите «Неизвестно»',
        );
    }
  } else {
    need(
      'places',
      x.allRussia || x.places?.length,
      'Выберите географию подбора',
    );
    need('scope', x.scope, 'Опишите состав работы');
    need('result', x.result, 'Опишите результат для клиента');
    need('timeline', x.timeline, 'Укажите срок или порядок его согласования');
    if (x.priceMode !== 'AGREEMENT') {
      need(
        'priceRubles',
        d.priceRubles != null && d.priceRubles > 0,
        'Укажите цену услуги',
      );
      need('priceUnit', x.priceUnit, 'Укажите единицу оплаты');
    }
  }
  return errors;
}
export function requireVersion(raw: unknown) {
  const version = object(raw).version;
  if (!Number.isSafeInteger(version) || Number(version) < 1)
    invalid('version', 'Обновите страницу перед сохранением');
  return Number(version);
}
export function servicePrice(d: LandDraft) {
  if (d.details.priceMode === 'AGREEMENT') return 'По договорённости';
  return `${d.details.priceMode === 'FROM' ? 'от ' : ''}${d.priceRubles} ₽${d.details.priceUnit ? ` / ${d.details.priceUnit}` : ''}`;
}
