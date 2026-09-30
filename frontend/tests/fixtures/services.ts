import type { ServiceDto } from "@/entities/service";

const categoryA = {
  id: "cat-a",
  name: "Перераспределение земельного участка",
  slug: "pereraspredelenie-zu",
  parentId: "root-1",
  sortOrder: 1,
};

const categoryB = {
  id: "cat-b",
  name: "Составление исковых заявлений",
  slug: "iskovye-zayavleniya",
  parentId: "root-2",
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
  categoryId: categoryA.id,
  category: categoryA,
  status: "PUBLISHED",
  title: "Межевание участка",
  publishedAt: "2026-09-20T10:00:00.000Z",
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
};

export const legalService: ServiceDto = {
  id: "svc-legal-1",
  categoryId: categoryB.id,
  category: categoryB,
  status: "DRAFT",
  title: "Судебное сопровождение",
  publishedAt: null,
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
};
