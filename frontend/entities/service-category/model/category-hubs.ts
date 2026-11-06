import { getCategoryGuide } from "./category-guides";

export type HubCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder?: number | null;
};

// Situations explain the choice of service; they do not diagnose the case
// or promise that a particular procedure will be available.
export const categorySituations: Record<string, string> = {
  "pereraspredelenie-zu": "Хочу изменить конфигурацию участка или разобраться с прилегающей землёй",
  "kadastr-raboty-egrn": "Нужны межевой или технический план и сведения для ЕГРН",
  "ustanovlenie-granic-zu": "Не понимаю, где проходит граница участка или правильно ли стоит забор",
  "ispravlenie-kadastrovoi-oshibki": "Площадь или границы в документах не совпадают с фактическими",
  "podklyuchenie-elektrichestva": "Нужно подключить участок или дом к электричеству",
  "oformlenie-dokumentov-na-zemlyu": "Есть документы на землю, но непонятно, чего не хватает для оформления",
  "oformlenie-uchastka-pod-domom": "Нужно разобраться с оформлением земли под существующим домом",
  "dachnaya-amnistiya": "Хочу выяснить, подходит ли упрощённое оформление для моего дома",
  "izmenenie-vri": "Планирую использовать участок иначе и хочу проверить допустимые варианты",
  "zemelnyi-servitut": "Нужен проход или проезд через соседний участок",
  "priznanie-prava-sobstvennosti": "Нужно разобраться, на каком основании можно подтвердить право на объект",
  "razresheniya-na-stroitelstvo": "Планирую строительство и хочу уточнить необходимые документы",
  "soprovozhdenie-sdelok": "Нужна помощь с условиями и оформлением покупки или продажи",
  "yuridicheskaya-proverka": "Перед покупкой хочу проверить документы и ограничения объекта",
  "predstavitelstvo-v-sude": "Нужна помощь с подготовкой к делу и участием в судебных заседаниях",
  "iskovye-zayavleniya": "Нужно подготовить иск или проверить уже составленное заявление",
  "prochee": "Моя задача затрагивает несколько направлений или не подходит под готовый список",
};

type ReadingReference = {
  slug: string;
  anchor: "guide-section-1" | "guide-section-2" | "guide-preparation" | "guide-question";
  title: string;
};

export const hubReading: Record<string, ReadingReference[]> = {
  "zemleustroystvo-i-kadastr": [
    { slug: "ustanovlenie-granic-zu", anchor: "guide-preparation", title: "Что подготовить для обсуждения границ участка" },
    { slug: "ispravlenie-kadastrovoi-oshibki", anchor: "guide-section-1", title: "С чего начать разбор ошибки в сведениях об участке" },
  ],
  "kommunikacii-i-podklyucheniya": [
    { slug: "podklyuchenie-elektrichestva", anchor: "guide-section-1", title: "Что уточнить перед подключением электричества" },
    { slug: "podklyuchenie-elektrichestva", anchor: "guide-preparation", title: "Какие исходные сведения подготовить для подключения" },
  ],
  "zemelnoe-pravo-i-oformlenie": [
    { slug: "oformlenie-dokumentov-na-zemlyu", anchor: "guide-section-1", title: "Как начать разбор имеющихся документов на землю" },
    { slug: "dachnaya-amnistiya", anchor: "guide-question", title: "Подходит ли дачная амнистия для любого дома" },
    { slug: "oformlenie-uchastka-pod-domom", anchor: "guide-section-1", title: "Почему сведения о доме и участке проверяют вместе" },
  ],
  "sdelki-i-proverka-nedvizhimosti": [
    { slug: "yuridicheskaya-proverka", anchor: "guide-preparation", title: "Что подготовить для проверки недвижимости" },
    { slug: "soprovozhdenie-sdelok", anchor: "guide-section-2", title: "Что обсудить при выборе сопровождения сделки" },
  ],
  "sudebnye-spory": [
    { slug: "predstavitelstvo-v-sude", anchor: "guide-section-1", title: "Какие материалы передать представителю по делу" },
    { slug: "iskovye-zayavleniya", anchor: "guide-section-2", title: "Что согласовать с исполнителем при подготовке иска" },
  ],
  "drugie-uslugi": [
    { slug: "prochee", anchor: "guide-section-1", title: "Как описать нестандартную задачу в заявке" },
    { slug: "prochee", anchor: "guide-section-2", title: "Как определить первый этап работы" },
  ],
};

// Curated connections, rather than automatic links to every other service.
export const relatedGuideSlugs: Record<string, string[]> = {
  "pereraspredelenie-zu": ["ustanovlenie-granic-zu", "oformlenie-dokumentov-na-zemlyu"],
  "kadastr-raboty-egrn": ["ustanovlenie-granic-zu", "ispravlenie-kadastrovoi-oshibki"],
  "ustanovlenie-granic-zu": ["ispravlenie-kadastrovoi-oshibki", "kadastr-raboty-egrn"],
  "ispravlenie-kadastrovoi-oshibki": ["ustanovlenie-granic-zu", "predstavitelstvo-v-sude"],
  "podklyuchenie-elektrichestva": ["zemelnyi-servitut", "oformlenie-dokumentov-na-zemlyu"],
  "oformlenie-dokumentov-na-zemlyu": ["kadastr-raboty-egrn", "priznanie-prava-sobstvennosti"],
  "oformlenie-uchastka-pod-domom": ["ustanovlenie-granic-zu", "oformlenie-dokumentov-na-zemlyu"],
  "dachnaya-amnistiya": ["kadastr-raboty-egrn", "oformlenie-uchastka-pod-domom"],
  "izmenenie-vri": ["razresheniya-na-stroitelstvo", "yuridicheskaya-proverka"],
  "zemelnyi-servitut": ["ustanovlenie-granic-zu", "predstavitelstvo-v-sude"],
  "priznanie-prava-sobstvennosti": ["oformlenie-dokumentov-na-zemlyu", "iskovye-zayavleniya"],
  "razresheniya-na-stroitelstvo": ["izmenenie-vri", "kadastr-raboty-egrn"],
  "soprovozhdenie-sdelok": ["yuridicheskaya-proverka", "oformlenie-dokumentov-na-zemlyu"],
  "yuridicheskaya-proverka": ["soprovozhdenie-sdelok", "ustanovlenie-granic-zu"],
  "predstavitelstvo-v-sude": ["iskovye-zayavleniya", "ispravlenie-kadastrovoi-oshibki"],
  "iskovye-zayavleniya": ["predstavitelstvo-v-sude", "priznanie-prava-sobstvennosti"],
  "prochee": ["oformlenie-dokumentov-na-zemlyu", "yuridicheskaya-proverka"],
};

function ownValue<T>(record: Record<string, T>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

export function getCategoryHubNavigation(category: HubCategory, categories: HubCategory[]) {
  const bySlug = new Map(categories.map((item) => [item.slug, item]));
  const situations = category.parentId == null
    ? categories
        .filter((item) => item.parentId === category.id)
        .sort((a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity) || a.name.localeCompare(b.name, "ru"))
        .map((item) => ({ category: item, situation: ownValue(categorySituations, item.slug) ?? item.name }))
    : [];
  const references: ReadingReference[] = category.parentId == null
    ? ownValue(hubReading, category.slug) ?? []
    : (ownValue(relatedGuideSlugs, category.slug) ?? []).map((slug) => ({
        slug,
        anchor: "guide-section-1",
        title: ownValue(categorySituations, slug) ?? `Хочу узнать, чем поможет услуга «${bySlug.get(slug)?.name ?? slug}»`,
      }));
  const reading = references.flatMap((reference) => {
    const target = bySlug.get(reference.slug);
    const guide = getCategoryGuide(reference.slug);
    if (!target || !guide || target.id === category.id) return [];
    return [{ ...reference, category: target }];
  });
  const parent = categories.find((item) => item.id === category.parentId);
  return {
    situations,
    reading,
    parent,
    parentSituation: parent ? `Не знаю, какую услугу выбрать в разделе «${parent.name}»` : undefined,
  };
}
