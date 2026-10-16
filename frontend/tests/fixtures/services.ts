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
  slug: "primer",
  verified: false,
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
  image: null,
  stockBadge: null,
  description: "Описание",
  paletteColor: "primary",
  rating: 4.7,
  reviewCount: 18,
  places: [
    {
      kind: "city",
      cityId: "city-1",
      name: "Екатеринбург",
      regionCode: "66",
      regionName: "Свердловская область",
    },
  ],
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
  image: null,
  stockBadge: `"Осталось 3 слота" или "Скидка 15%"`,
  description: null,
  paletteColor: null,
  rating: null,
  reviewCount: null,
  places: [
    {
      kind: "region",
      name: "обл. Свердловская",
      regionCode: "66",
      regionName: "обл. Свердловская",
    },
  ],
};
