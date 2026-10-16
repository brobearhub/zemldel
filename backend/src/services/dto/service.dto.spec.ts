import { describe, expect, it } from 'vitest';
import { serviceDbRowToDtoPlain, type ServiceDbRow } from './service.dto';

const row: ServiceDbRow = {
  id: 'svc-1',
  categoryId: 'cat-1',
  category: {
    id: 'cat-1',
    name: 'Межевание',
    slug: 'mezhevanie',
    parentId: null,
    sortOrder: null,
  },
  status: 'PUBLISHED',
  title: 'Вынос границ',
  publishedAt: null,
  image: null,
  stockBadge: null,
  price: '1000',
  rating: null,
  reviewCount: null,
  description: null,
  paletteColor: null,
  provider: {
    id: 'prov-1',
    name: 'Анна Смирнова',
    slug: 'anna-smirnova',
    type: 'SELF_EMPLOYED',
    verificationStatus: 'NOT_VERIFIED',
    city: null,
  },
  cities: [],
  regions: [],
};

describe('serviceDbRowToDtoPlain', () => {
  it('в публичной карточке услуги показывает самозанятого как «Имя Ф.»', () => {
    expect(serviceDbRowToDtoPlain(row).provider.name).toBe('Анна С.');
  });
});
