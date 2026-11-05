/** Публичный адрес сайта для canonical и Open Graph. */
export function siteOrigin(): string {
  const raw = process.env.NEXTAUTH_URL?.trim() ||
    (process.env.NODE_ENV === "production" ? "https://zemledel.ru" : "http://localhost:4000");
  return new URL(raw).origin;
}
