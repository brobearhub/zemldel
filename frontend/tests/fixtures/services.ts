import type { ServiceDto } from "@/entities/service";

const mainCategory = {
  id: "cat-main",
  name: "Основные услуги",
  slug: "main",
  parentId: null,
  sortOrder: 1,
};

const legalCategory = {
  id: "cat-legal",
  name: "Юридические услуги",
  slug: "legal",
  parentId: null,
  sortOrder: 2,
};

const provider = {
  id: "prov-1",
  name: "ООО «Пример»",
  city: {
    id: "city-1",
    name: "Екатеринбург",
    regionCode: "66",
    regionName: "Свердловская область",
  },
};

export const mainService: ServiceDto = {
  id: "svc-main-1",
  categoryId: mainCategory.id,
  category: mainCategory,
  status: "PUBLISHED",
  title: "Межевание участка",
  price: "от 15 000 ₽",
  provider,
  ctaText: "Записаться",
  ctaHref: "#contacts",
  image: null,
  stockBadge: null,
  description: "Описание",
  highlight: "участка",
  badge: "90% выгода",
  paletteColor: "primary",
  icon: "map",
  rating: 4.7,
  reviewCount: 18,
  templateId: null,
  template: null,
};

export const legalService: ServiceDto = {
  id: "svc-legal-1",
  categoryId: legalCategory.id,
  category: legalCategory,
  status: "DRAFT",
  title: "Судебное сопровождение",
  price: "от 30 000 ₽",
  provider,
  ctaText: "Оставить заявку",
  ctaHref: null,
  image: null,
  stockBadge: "Осталось 3 слота",
  description: null,
  highlight: null,
  badge: null,
  paletteColor: null,
  icon: null,
  rating: null,
  reviewCount: null,
  templateId: null,
  template: null,
};
