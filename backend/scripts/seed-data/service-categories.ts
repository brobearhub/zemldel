export type ServiceCategorySeed = {
  slug: string;
  name: string;
  sortOrder?: number | null;
  children?: readonly ServiceCategorySeed[];
};

/**
 * Этап 1: дерево категорий.
 * - root (parentId=null) = "раздел"
 * - leaf (child) = "шаблон/тип услуги"
 */
export const SERVICE_CATEGORIES_SEED: readonly ServiceCategorySeed[] = [
  {
    slug: "zemleustroystvo-i-kadastr",
    name: "Землеустройство и кадастр",
    children: [
      { slug: "pereraspredelenie-zu", name: "Перераспределение земельного участка" },
      { slug: "kadastr-raboty-egrn", name: "Кадастровые работы (межевание/техпланы/ЕГРН)" },
      { slug: "ustanovlenie-granic-zu", name: "Установление границ земельного участка" },
      { slug: "ispravlenie-kadastrovoi-oshibki", name: "Исправление кадастровой ошибки" },
    ],
  },
  {
    slug: "kommunikacii-i-podklyucheniya",
    name: "Коммуникации и подключения",
    children: [{ slug: "podklyuchenie-elektrichestva", name: "Подключение электричества" }],
  },
  {
    slug: "zemelnoe-pravo-i-oformlenie",
    name: "Земельное право и оформление",
    children: [
      { slug: "oformlenie-dokumentov-na-zemlyu", name: "Оформление документов на землю" },
      { slug: "oformlenie-uchastka-pod-domom", name: "Оформление участка под домом" },
      { slug: "dachnaya-amnistiya", name: "Сопровождение дачной амнистии" },
      { slug: "izmenenie-vri", name: "Изменение вида разрешённого использования (ВРИ)" },
      { slug: "zemelnyi-servitut", name: "Установление земельного сервитута" },
      { slug: "priznanie-prava-sobstvennosti", name: "Признание права собственности" },
      { slug: "razresheniya-na-stroitelstvo", name: "Оформление разрешений на строительство" },
    ],
  },
  {
    slug: "sdelki-i-proverka-nedvizhimosti",
    name: "Сделки и проверка недвижимости",
    children: [
      { slug: "soprovozhdenie-sdelok", name: "Сопровождение сделок с недвижимостью" },
      { slug: "yuridicheskaya-proverka", name: "Юридическая проверка недвижимости" },
    ],
  },
  {
    slug: "sudebnye-spory",
    name: "Судебные споры",
    children: [
      { slug: "predstavitelstvo-v-sude", name: "Представительство в суде" },
      { slug: "iskovye-zayavleniya", name: "Составление исковых заявлений" },
    ],
  },
  {
    slug: "semeynoe-pravo",
    name: "Семейное право",
    children: [{ slug: "razdel-imushchestva", name: "Раздел имущества" }],
  },
  {
    slug: "drugie-uslugi",
    name: "Другие услуги",
    children: [{ slug: "prochee", name: "Прочее" }],
  },
] as const;

