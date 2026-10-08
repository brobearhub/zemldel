/** Публичные CDN, с которых браузер в dev получает 407, а сервер Next — 200. */
export const PUBLIC_CDN_HOSTS = ["cdn.zemledel.pro", "cdn.zemledelpro.ru"] as const;

const HOSTS = new Set<string>(PUBLIC_CDN_HOSTS);

export function isPublicCdnHost(host: string): boolean {
  return HOSTS.has(host);
}

/**
 * В dev подменяет абсолютный URL публичного CDN на same-origin прокси.
 * Why: Chrome кэширует 407 Proxy Authentication Required на прямой запрос к CDN,
 * серверный fetch того же объекта отвечает 200. В production адрес не меняется.
 */
export function toPublicAssetSrc(url: string): string {
  if (process.env.NODE_ENV === "production") return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  if (parsed.protocol !== "https:" || !HOSTS.has(parsed.hostname)) return url;

  const path = parsed.pathname.replace(/^\/+/, "");
  const local = `/api/dev-cdn/${parsed.hostname}/${path}`;
  return parsed.search ? `${local}${parsed.search}` : local;
}
