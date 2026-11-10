export type BillingPeriod = "MONTH" | "YEAR";
export const billingProducts = {
  LITE: { plan: "LITE", period: "MONTH" },
  BUSINESS: { plan: "BUSINESS", period: "MONTH" },
  LITE_YEAR: { plan: "LITE", period: "YEAR" },
  BUSINESS_YEAR: { plan: "BUSINESS", period: "YEAR" },
} as const;
export type Product = keyof typeof billingProducts;
export type BillingCatalog = Record<Product, { amount: number }>;
export function productFor(
  plan: "LITE" | "BUSINESS",
  period: BillingPeriod,
): Product {
  return period === "YEAR" ? `${plan}_YEAR` : plan;
}
export function money(kopecks: number) {
  return (kopecks / 100).toLocaleString("ru-RU", {
    minimumFractionDigits: kopecks % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
export function periodLabel(period: BillingPeriod) {
  return period === "YEAR" ? "год" : "месяц";
}
export const plans = [
  {
    id: "STANDARD",
    name: "Стандарт",
    description: "Чтобы начать и найти первых клиентов",
  },
  {
    id: "LITE",
    name: "Лайт",
    description: "Больше возможностей для самостоятельной работы",
  },
  {
    id: "BUSINESS",
    name: "Бизнес",
    description: "Для расширенной статистики и оформления услуг",
  },
] as const;
export const comparison = [
  ["Формат историй", "Фото", "Фото", "Фото и видео до 2 минут"],
  ["Истории в сутки", "1", "5", "20"],
  ["Срок показа истории", "24 часа", "24 или 48 часов", "6, 12, 24 или 48 часов"],
  ["Текст истории", "До 500 символов", "До 1000 символов", "До 2048 символов"],
  ["Оформление текста истории", "Обычный текст", "Жирный и курсив", "Жирный, курсив и ссылки"],
  ["Фото в каждой услуге", "1", "3", "10"],
  ["Метка на карточке", "Без метки", "Основной цвет", "Все цвета"],
  [
    "Статистика",
    "Базовые счётчики",
    "Услуги и конверсия",
    "Регионы, команда и этапы",
  ],
];
export const productNames: Record<string, string> = {
  STANDARD: "Стандарт",
  LITE: "Лайт",
  BUSINESS: "Бизнес",
  LITE_YEAR: "Лайт на год",
  BUSINESS_YEAR: "Бизнес на год",
  REPLIES_10: "10 откликов",
  PROVIDER_SLUG_CHANGE: "Смена адреса профиля",
};
export const statusNames: Record<string, string> = {
  INITIALIZING: "Создание платежа",
  NEW: "Ожидает оплаты",
  FORM_SHOWED: "Ожидает оплаты",
  AUTHORIZED: "Ожидает подтверждения",
  CONFIRMED: "Оплачен",
  REJECTED: "Отклонён",
  CANCELED: "Отменён",
  DEADLINE_EXPIRED: "Срок оплаты истёк",
  AUTH_FAIL: "Ошибка оплаты",
  REVERSED: "Отменён банком",
  REFUNDED: "Возвращён",
  PARTIAL_REFUNDED: "Частичный возврат",
  INIT_FAILED: "Не создан",
};
export type BillingOrder = {
  id: string;
  product: string;
  amount: number;
  status: string;
  createdAt: string;
  fulfilledAt: string | null;
  paymentUrl: string | null;
};
export type BillingOverview = {
  catalog: BillingCatalog;
  entitlementPlan: string;
  enforcementEnabled: boolean;
  limits: {
    photos: number;
    regions: number | null;
    replies: number | null;
    templates: boolean;
    sharedTemplates: boolean;
    team: boolean;
    statistics: number;
  };
  autoRenew: boolean;
  canAutoRenew: boolean;
  nextPlan: string | null;
  billingPeriod: BillingPeriod;
  nextBillingPeriod: BillingPeriod | null;
  renewalPending: boolean;
  timezone: string;
  graceUntil: string | null;
  dailyUsed: number;
  quotaResetAt: string;
  notices: { id: string; message: string; createdAt: string }[];
  mode: "test" | "live";
  configurationError?: string | null;
  enabled: boolean;
  canPay: boolean;
  plan: string;
  planExpiresAt: string | null;
  replyCredits: number;
  needsReview: boolean;
  orders: BillingOrder[];
};
