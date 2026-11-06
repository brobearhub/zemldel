export type Product = "LITE" | "BUSINESS" | "REPLIES_10";
export const plans = [
  {
    id: "STANDARD",
    name: "Стандарт",
    price: 0,
    description: "Чтобы начать и найти первых клиентов",
  },
  {
    id: "LITE",
    name: "Лайт",
    price: 299,
    description: "Больше возможностей для самостоятельной работы",
  },
  {
    id: "BUSINESS",
    name: "Бизнес",
    price: 999,
    description: "Для команды и работы в нескольких регионах",
  },
] as const;
export const comparison = [
  ["Фото в каждой услуге", "1", "3", "10"],
  ["Метка на карточке", "Без метки", "Основной цвет", "Все цвета"],
  [
    "География объявлений",
    "1 область или города в ней",
    "3 области или города в них",
    "Вся Россия, любые области и города",
  ],
  [
    "Свободные заявки",
    "5 откликов в день",
    "10 откликов в день",
    "Без ограничений",
  ],
  [
    "Статистика",
    "Базовые счётчики",
    "Услуги и конверсия",
    "Регионы, команда и этапы",
  ],
  ["Шаблоны ответов", "—", "Личные", "Личные и общие"],
  [
    "Инструменты команды",
    "Базовые",
    "Базовые",
    "Назначения, заметки, сроки и история",
  ],
];
export const productNames: Record<string, string> = {
  STANDARD: "Стандарт",
  LITE: "Лайт",
  BUSINESS: "Бизнес",
  REPLIES_10: "10 откликов",
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
  timezone: string;
  graceUntil: string | null;
  dailyUsed: number;
  quotaResetAt: string;
  notices: { id: string; message: string; createdAt: string }[];
  mode: "test";
  enabled: boolean;
  canPay: boolean;
  plan: string;
  planExpiresAt: string | null;
  replyCredits: number;
  needsReview: boolean;
  orders: BillingOrder[];
};
