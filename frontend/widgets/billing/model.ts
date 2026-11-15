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
  },
  {
    id: "LITE",
    name: "Лайт",
  },
  {
    id: "BUSINESS",
    name: "Бизнес",
  },
] as const;
export const requestsAvailability =
  "На любом тарифе, включая бесплатный «Стандарт», вы всегда сможете получать заявки по всем вашим услугам и общаться с клиентами по ним без ограничений.";
export const dailyStoryLimits = ["1", "5", "20"] as const;
export const servicePhotoLimits = ["1", "3", "10"] as const;
export type PlanComparisonFeature = {
  label: string;
  values: readonly [string, string, string];
  details?: readonly string[];
};
export const comparison: readonly PlanComparisonFeature[] = [
  {
    label: "Заявки по всем услугам и общение по ним",
    values: ["Без ограничений", "Без ограничений", "Без ограничений"],
  },
  {
    label: "Счётчики сохранений услуг и профиля",
    values: ["Да", "Да", "Да"],
  },
  {
    label: "Клиент добавил вас как исполнителя к себе в избранное",
    values: ["Только количество", "Только количество", "Список клиентов"],
    details: [
      "Клиент добавляет ваш профиль исполнителя к себе в избранное, чтобы позже вернуться к вам и посмотреть ваши услуги.",
      "На всех тарифах видно количество сохранений вашего профиля. На «Бизнесе» дополнительно доступен список клиентов, которые сохранили вас как исполнителя в избранное: имя и город клиента. Телефон и почта через избранное не раскрываются.",
      "На тарифе «Бизнес» можно написать такому клиенту первым и предложить свои услуги, даже если он ещё не оставил заявку. До ответа клиента можно отправить одно сообщение, а после ответа — продолжить переписку.",
      `Эта возможность относится только к избранному. ${requestsAvailability}`,
    ],
  },
  {
    label: "Клиент добавил вашу услугу к себе в избранное",
    values: ["Только количество", "Только количество", "Список клиентов и услуг"],
    details: [
      "Клиент добавляет конкретную вашу услугу к себе в избранное, чтобы позже вернуться к её описанию и условиям. Услуга сохраняется отдельно от вашего профиля исполнителя.",
      "На всех тарифах видно количество сохранений каждой услуги. На «Бизнесе» дополнительно доступен список клиентов и услуг, которые они сохранили. В списке показаны имя с первой буквой фамилии, например «Анна К.», и город клиента, если он указан. Телефон и почта через избранное не раскрываются.",
      "На тарифе «Бизнес» можно написать такому клиенту первым и предложить свои услуги, даже если он ещё не оставил заявку. До ответа клиента можно отправить одно сообщение, а после ответа — продолжить переписку.",
      `Эта возможность относится только к избранному. ${requestsAvailability}`,
    ],
  },
  {
    label: "Написать первым тем, кто вас сохранил",
    values: ["Не входит", "Не входит", "Можно написать первым"],
    details: [
      "На «Бизнесе» вы можете сами предложить услуги клиенту, который добавил вашу услугу или профиль в избранное, даже если он ещё не оставил заявку.",
      "Каждому такому клиенту можно отправить одно текстовое сообщение до его ответа. Это общее ограничение для вас и сотрудников профиля: клиент сам решает, хочет ли продолжить разговор. После его ответа можно переписываться дальше.",
      "Диалог идёт на сайте и сохраняется после окончания «Бизнеса». Если клиент уже ответил, переписку можно продолжать на любом тарифе. Клиент может отклонить обращение или заблокировать диалог.",
      `${requestsAvailability} «Бизнес» нужен только для первого сообщения клиенту по избранному.`,
    ],
  },
  {
    label: "Продолжение прямой переписки после ответа клиента",
    values: ["Да", "Да", "Да"],
  },
  {
    label: "Формат историй",
    values: ["Фото", "Фото", "Фото и видео до 2 минут"],
  },
  {
    label: "Истории в сутки",
    values: dailyStoryLimits,
  },
  {
    label: "Срок показа истории",
    values: ["24 часа", "24 или 48 часов", "6, 12, 24 или 48 часов"],
  },
  {
    label: "Текст истории",
    values: ["До 500 символов", "До 1000 символов", "До 2048 символов"],
  },
  {
    label: "Оформление текста истории",
    values: ["Обычный текст", "Жирный и курсив", "Жирный, курсив и ссылки"],
  },
  {
    label: "Фото в каждой услуге",
    values: servicePhotoLimits,
  },
  {
    label: "Метка на карточке",
    values: ["Без метки", "Основной цвет", "Все цвета"],
  },
  {
    label: "Статистика",
    values: ["Базовые счётчики", "Услуги и конверсия", "Регионы, команда и этапы"],
  },
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
