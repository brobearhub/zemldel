/** Боевой сайт. Локальный и любой другой адрес файл не публикуют. */
const LLMS_TXT_HOSTS = new Set(["zemledelpro.ru", "www.zemledelpro.ru"]);

export type LlmsCategory = {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
};

export function isLlmsTxtPublic(origin: string): boolean {
  try {
    return LLMS_TXT_HOSTS.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function linkLabel(value: string): string {
  return value.replace(/[\[\]]/g, "").replace(/\s+/g, " ").trim();
}

function pageLink(origin: string, path: string, label: string, description: string): string {
  const href = path === "/" ? origin : `${origin}${path}`;
  return `- [${linkLabel(label)}](${href}): ${description}`;
}

/**
 * Индекс сайта в формате https://llmstxt.org.
 * Чистая сборка текста: откуда брать категории, решает вызывающий код.
 */
export function buildLlmsTxt(origin: string, categories: readonly LlmsCategory[]): string {
  const base = origin.replace(/\/$/, "");
  const roots = categories.filter(
    (category) => category.parentId == null && category.id.trim() !== "" && category.name.trim() !== "",
  );

  const categoryLines =
    roots.length > 0
      ? roots
          .map(
            (category) =>
              `- [${linkLabel(category.name)}](${base}/service-categories/${encodeURIComponent(category.id.trim())}): услуги и исполнители в этой категории`,
          )
          .join("\n")
      : "- Актуальный список открывается на главной странице.";

  return `# Земледел

> Платформа услуг по земельным участкам: каталог исполнителей, заявки, переписка и договоры.

Земледел помогает заказчику найти услугу по участку и оставить заявку, а исполнителю — опубликовать услуги и вести заказы. Слоган сайта: «Ваш путь к идеальному участку». Язык интерфейса — русский.

На главной показаны категории услуг, каталог по выбранному городу и короткие истории пользователей и исполнителей. Карточка услуги открывается по адресу /services/{id}, публичный профиль исполнителя — по адресу /providers/{slug}. У услуги есть название, описание, цена в рублях и места работы: города или области.

Заказчик выбирает услугу или категорию и отправляет заявку. Подходящий исполнитель видит её у себя. Когда исполнитель принимает заявку, она становится заказом: открываются контакты, чат и возможность подготовить договор. Отзыв оставляют после начала работы. Оценка заказчика влияет на рейтинг услуги и исполнителя.

Кабинеты заказчика (/profile), исполнителя (/pro), переписка (/chats) открываются только после входа. Это личные разделы, а не публичное описание сайта.

## Публичные страницы

${pageLink(base, "/", "Главная", "категории, каталог услуг по городу и истории")}
${pageLink(base, "/about", "О компании", "описание сервиса и контакты")}
${pageLink(base, "/signup", "Регистрация", "отдельный аккаунт заказчика или исполнителя")}
${pageLink(base, "/signin", "Вход", "вход в существующий аккаунт")}

## Категории услуг

${categoryLines}

## Документы

${pageLink(base, "/terms", "Пользовательское соглашение", "правила использования платформы")}
${pageLink(base, "/privacy", "Политика обработки персональных данных", "какие данные собираются и зачем")}
${pageLink(base, "/consent", "Согласие на обработку персональных данных", "текст согласия пользователя")}
${pageLink(base, "/offer", "Оферта на оказание платных услуг", "условия платных услуг")}

## Для поисковых систем

${pageLink(base, "/sitemap.xml", "Карта сайта", "опубликованные услуги, категории и профили исполнителей")}
${pageLink(base, "/robots.txt", "Правила обхода", "какие адреса можно индексировать")}
`;
}
