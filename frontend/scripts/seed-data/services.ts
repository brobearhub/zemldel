import type { ServiceRecordRequestDto } from "../../entities/service/ServiceRecordRequest.dto";

const MAIN_CATEGORY_ID = "11111111-1111-1111-1111-111111111111";
const LEGAL_CATEGORY_ID = "22222222-2222-2222-2222-222222222222";

export const SERVICES_SEED: ServiceRecordRequestDto[] = [
  // --- Main services ---
  {
    categoryId: MAIN_CATEGORY_ID,
    title:
      "Перераспределение земельного участка. Увеличение площади за счёт прилегающей территории.",
    description:
      "Увеличение площади земельного участка за счет прилегающей территории.",
    highlight: "за счет прилегающей территории",
    image: "/hero-bg-house_static_day.jpg",
    price: "от 25 000 ₽",
    stockBadge: "Популярно",
    rating: 5,
    reviewCount: 12,
    ctaText: "Записаться",
    ctaHref: "#contacts",
    paletteColor: "secondary",
    icon: "map",
  },
  {
    categoryId: MAIN_CATEGORY_ID,
    title:
      "Подключение электричества. Подача заявок для физлиц и юрлиц, льготное подключение.",
    description:
      "Подача заявок на подключение электричества для физических и юридических лиц. Льготное подключение с выгодой до 90% от цены рынка.",
    highlight: "выгодой до 90% от цены рынка",
    badge: "90% выгода",
    image: "/hero-bg-house_static_day.jpg",
    price: "от 5 500 ₽",
    stockBadge: "90% выгода",
    rating: 5,
    reviewCount: 8,
    ctaText: "Узнать стоимость",
    ctaHref: "#contacts",
    paletteColor: "primary",
    icon: "electric",
  },
  {
    categoryId: MAIN_CATEGORY_ID,
    title:
      "Кадастровые работы: межевание, техпланы, постановка на учёт и внесение изменений в ЕГРН.",
    description:
      "Межевание и подготовка технических/межевых планов, постановка на кадастровый учёт и внесение изменений в ЕГРН.",
    highlight: "ЕГРН",
    image: "/hero-bg-house_static_day.jpg",
    price: "от 15 000 ₽",
    rating: 4.9,
    reviewCount: 24,
    ctaText: "Консультация",
    ctaHref: "#contacts",
    paletteColor: "error",
    icon: "architecture",
  },

  // --- Legal services ---
  ...[
    { title: "Изменение вида разрешённого использования земли", price: "от 35 000 ₽" },
    { title: "Признание права собственности", price: "от 45 000 ₽" },
    { title: "Оформление документов на землю", price: "от 28 000 ₽" },
    { title: "Оформление участка под домом", price: "от 32 000 ₽" },
    { title: "Оформление разрешений на строительство", price: "от 40 000 ₽" },
    { title: "Исправление кадастровой ошибки", price: "от 25 000 ₽" },
    { title: "Установление земельного сервитута", price: "от 30 000 ₽" },
    { title: "Сопровождение дачной амнистии", price: "от 22 000 ₽" },
    { title: "Установление границ земельного участка", price: "от 38 000 ₽" },
    { title: "Сопровождение сделок с недвижимостью", price: "от 50 000 ₽" },
    { title: "Представительство в суде", price: "от 35 000 ₽" },
    { title: "Составление исковых заявлений", price: "от 15 000 ₽" },
    { title: "Юридическая проверка недвижимости", price: "от 18 000 ₽" },
    { title: "Раздел имущества", price: "от 42 000 ₽" },
  ].map((item, i) => ({
    categoryId: LEGAL_CATEGORY_ID,
    title: item.title,
    price: item.price,
    image: "/hero-bg-house_static.jpg",
    rating: i % 3 === 0 ? 5 : undefined,
    reviewCount: i % 2 === 0 ? (i % 5) + 1 : undefined,
    ctaText: "Записаться",
    ctaHref: "#contacts",
  })),
];

