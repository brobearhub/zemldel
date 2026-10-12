export type ServiceCategorySeed = {
  slug: string;
  name: string;
  /** Короткая подпись для узких экранов. */
  shortName: string;
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
    slug: 'zemleustroystvo-i-kadastr',
    name: 'Землеустройство и кадастр',
    shortName: 'Кадастр',
    children: [
      {
        slug: 'pereraspredelenie-zu',
        name: 'Перераспределение земельного участка',
        shortName: 'Перераспределение',
      },
      {
        slug: 'kadastr-raboty-egrn',
        name: 'Кадастровые работы (межевание/техпланы/ЕГРН)',
        shortName: 'Кадастровые работы',
      },
      {
        slug: 'ustanovlenie-granic-zu',
        name: 'Установление границ земельного участка',
        shortName: 'Границы участка',
      },
      {
        slug: 'ispravlenie-kadastrovoi-oshibki',
        name: 'Исправление кадастровой ошибки',
        shortName: 'Кадастровая ошибка',
      },
    ],
  },
  {
    slug: 'kommunikacii-i-podklyucheniya',
    name: 'Коммуникации и подключения',
    shortName: 'Коммуникации',
    children: [
      {
        slug: 'podklyuchenie-elektrichestva',
        name: 'Подключение электричества',
        shortName: 'Электричество',
      },
    ],
  },
  {
    slug: 'zemelnoe-pravo-i-oformlenie',
    name: 'Земельное право и оформление',
    shortName: 'Оформление',
    children: [
      {
        slug: 'oformlenie-dokumentov-na-zemlyu',
        name: 'Оформление документов на землю',
        shortName: 'Документы на землю',
      },
      {
        slug: 'oformlenie-uchastka-pod-domom',
        name: 'Оформление участка под домом',
        shortName: 'Участок под домом',
      },
      {
        slug: 'dachnaya-amnistiya',
        name: 'Сопровождение дачной амнистии',
        shortName: 'Дачная амнистия',
      },
      {
        slug: 'izmenenie-vri',
        name: 'Изменение вида разрешённого использования (ВРИ)',
        shortName: 'Смена ВРИ',
      },
      {
        slug: 'zemelnyi-servitut',
        name: 'Установление земельного сервитута',
        shortName: 'Сервитут',
      },
      {
        slug: 'priznanie-prava-sobstvennosti',
        name: 'Признание права собственности',
        shortName: 'Право собственности',
      },
      {
        slug: 'razresheniya-na-stroitelstvo',
        name: 'Оформление разрешений на строительство',
        shortName: 'Разрешение на стройку',
      },
    ],
  },
  {
    slug: 'sdelki-i-proverka-nedvizhimosti',
    name: 'Сделки и проверка недвижимости',
    shortName: 'Сделки',
    children: [
      {
        slug: 'soprovozhdenie-sdelok',
        name: 'Сопровождение сделок с недвижимостью',
        shortName: 'Сопровождение',
      },
      {
        slug: 'yuridicheskaya-proverka',
        name: 'Юридическая проверка недвижимости',
        shortName: 'Юрпроверка',
      },
    ],
  },
  {
    slug: 'sudebnye-spory',
    name: 'Судебные споры',
    shortName: 'Суды',
    children: [
      {
        slug: 'predstavitelstvo-v-sude',
        name: 'Представительство в суде',
        shortName: 'Представительство',
      },
      {
        slug: 'iskovye-zayavleniya',
        name: 'Составление исковых заявлений',
        shortName: 'Иски',
      },
    ],
  },
  {
    slug: 'drugie-uslugi',
    name: 'Другие услуги',
    shortName: 'Другое',
    children: [{ slug: 'prochee', name: 'Прочее', shortName: 'Прочее' }],
  },
] as const;
