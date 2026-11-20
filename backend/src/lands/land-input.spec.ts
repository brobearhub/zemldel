import { describe, it, expect } from 'vitest';
import { publicationErrors, readLandDraft } from './land-input';
const base = {
  title: 'Участок для теста',
  description: 'Описание тестового предложения о земельном участке.',
  cadastralNumber: '66:41:0000000:123',
  address: 'Тестовый адрес',
  category: 'SETTLEMENT',
  permittedUses: ['ИЖС 2.1'],
  areaM2: 1200,
  latitude: 56.8,
  longitude: 60.6,
  priceRubles: 1000000,
};
describe('land publication contract', () => {
  it('saves an empty draft but requires cadastral identity, location, land attributes and price for publication', () => {
    const draft = readLandDraft({}, 'SALE');
    expect(publicationErrors(draft, 'SALE')).toMatchObject({
      cadastralNumber: expect.any(String),
      latitude: expect.any(String),
      areaM2: expect.any(String),
      priceRubles: expect.any(String),
      permittedUses: expect.any(String),
    });
    expect(publicationErrors(readLandDraft(base, 'SALE'), 'SALE')).toEqual({});
  });
  it('keeps unknown facts distinct from a seller declaring absence', () => {
    expect(readLandDraft(base, 'SALE').details.restrictions).toBe('UNKNOWN');
    expect(
      readLandDraft({ ...base, details: { restrictions: 'NO' } }, 'SALE')
        .details.restrictions,
    ).toBe('NO');
  });
  it.each([
    [0, 2],
    [2, 2],
    [3, 2],
    [1.5, 3],
  ])('rejects invalid share %s/%s', (n, d) => {
    if (n === 0)
      expect(() =>
        readLandDraft(
          {
            ...base,
            dealType: 'SHARE',
            details: { shareNumerator: n, shareDenominator: d },
          },
          'SALE',
        ),
      ).toThrow();
    else
      expect(
        publicationErrors(
          readLandDraft(
            {
              ...base,
              dealType: 'SHARE',
              details: { shareNumerator: n, shareDenominator: d },
            },
            'SALE',
          ),
          'SALE',
        ),
      ).toHaveProperty('shareNumerator');
  });
  it('never derives a share area and strips fields of another deal', () => {
    const draft = readLandDraft(
      {
        ...base,
        dealType: 'SHARE',
        details: {
          shareNumerator: 1,
          shareDenominator: 2,
          rentRubles: 900,
          useAgreement: 'Неизвестно',
          coOwnerNotice: 'Неизвестно',
        },
      },
      'SALE',
    );
    expect(draft.areaM2).toBe(1200);
    expect(draft.details).not.toHaveProperty('rentRubles');
    expect(publicationErrors(draft, 'SALE')).toEqual({});
  });
  it('accepts 200 shares and keeps legacy fractions readable until corrected for publication', () => {
    const input = {
      ...base,
      dealType: 'SHARE',
      details: {
        shareNumerator: 199,
        shareDenominator: 200,
        useAgreement: 'Неизвестно',
        coOwnerNotice: 'Неизвестно',
      },
    };
    expect(publicationErrors(readLandDraft(input, 'SALE'), 'SALE')).toEqual({});
    input.details.shareDenominator = 201;
    expect(() => readLandDraft(input, 'SALE')).toThrow(/до 200/);
    const legacy = readLandDraft(input, 'SALE', 'stored');
    expect(legacy.details.shareDenominator).toBe(201);
    expect(publicationErrors(legacy, 'SALE')).toHaveProperty(
      'shareDenominator',
    );
    input.details.shareNumerator = 201;
    input.details.shareDenominator = 200;
    expect(() => readLandDraft(input, 'SALE')).toThrow(/от 1 до 200/);
  });
  it('requires rent, period and independent lease conditions, supports an indefinite term', () => {
    const draft = readLandDraft(
      {
        ...base,
        dealType: 'LEASE_ASSIGNMENT',
        priceRubles: 0,
        details: {
          leaseIndefinite: true,
          rentRubles: 2000,
          rentPeriod: 'YEAR',
          landlord: 'Муниципалитет',
          transferConditions: 'По договору',
          landlordConsent: 'Неизвестно',
          arrears: 'Нет',
          extraPayments: 'Нет',
        },
      },
      'SALE',
    );
    expect(publicationErrors(draft, 'SALE')).toEqual({});
    expect(draft.priceRubles).toBe(0);
    expect(draft.details.rentRubles).toBe(2000);
    expect(draft.details.leaseUntil).toBe('');
  });
  it.each(['2027-02-30', '2027-13-01', 'nonsense'])(
    'rejects malformed lease date %s without a server crash',
    (date) => {
      expect(() =>
        readLandDraft(
          { dealType: 'LEASE_ASSIGNMENT', details: { leaseUntil: date } },
          'SALE',
        ),
      ).toThrow(/дату/);
    },
  );
  it('drops untrusted verification, status, document paths and unrelated fields', () => {
    const draft = readLandDraft(
      {
        ...base,
        documentStatus: 'VERIFIED',
        status: 'PUBLISHED',
        details: { storageKey: 'private/secret', verified: true },
      },
      'SALE',
    );
    expect(draft).not.toHaveProperty('documentStatus');
    expect(draft).not.toHaveProperty('status');
    expect(draft.details).not.toHaveProperty('storageKey');
  });
  it('uses no cadastral number for selection and distinguishes price on request', () => {
    const draft = readLandDraft(
      {
        ...base,
        details: {
          allRussia: true,
          scope: 'Подбор',
          result: 'Список вариантов',
          timeline: '2 недели',
          priceMode: 'AGREEMENT',
        },
      },
      'SELECTION',
    );
    expect(draft.cadastralNumber).toBe('');
    expect(draft.priceRubles).toBeNull();
    expect(publicationErrors(draft, 'SELECTION')).toEqual({});
  });
});
