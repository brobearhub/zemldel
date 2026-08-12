/**
 * Единые отступы (site): зазор header → контент задаётся только spacer'ом в `(site)/layout.tsx`.
 * Страницы не добавляют свой `pt`/`py` сверху — иначе снова будет разнобой.
 */

/** Auth-страницы на весь экран: без spacer и footer, фон под fixed header. */
const FULL_BLEED_AUTH_PATHS = new Set(["/signin", "/signup", "/welcome"]);

export function isFullBleedAuthPath(pathname: string): boolean {
  return FULL_BLEED_AUTH_PATHS.has(pathname);
}

/** Высота Toolbar хедера (см. `widgets/header/ui`). */
export const SITE_HEADER_HEIGHT_PX = {
  xs: 60,
  sm: 70,
} as const;

/** Зазор между низом хедера и верхом контента (px). */
export const SITE_CONTENT_GAP_PX = {
  xs: 16,
  sm: 20,
} as const;

/** Высота spacer'а под fixed header = высота хедера + единый зазор. */
export const SITE_HEADER_SPACER_PX = {
  xs: SITE_HEADER_HEIGHT_PX.xs + SITE_CONTENT_GAP_PX.xs,
  sm: SITE_HEADER_HEIGHT_PX.sm + SITE_CONTENT_GAP_PX.sm,
} as const;

/** sticky `top` для сайдбаров/чата — совпадает со spacer на sm+ (основные трёхколоночные layout'ы). */
export const SITE_STICKY_TOP_PX = SITE_HEADER_SPACER_PX.sm;

/** Ширина cabinet-сайдбара (профиль / pro) в развёрнутом и свёрнутом виде. */
export const CABINET_SIDEBAR_EXPANDED_W = 220;
export const CABINET_SIDEBAR_COLLAPSED_W = 72;

/** Нижний отступ page-container'ов (MUI spacing). */
export const SITE_PAGE_PB = 10;

/** sx для обычных Container-страниц: без верхнего padding, единый низ. */
export const sitePageContainerSx = {
  pt: 0,
  pb: SITE_PAGE_PB,
} as const;
