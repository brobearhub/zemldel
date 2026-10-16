/** Публичный адрес сайта для canonical и Open Graph. */
export function siteOrigin(): string {
  const raw = process.env.NEXTAUTH_URL ?? "http://localhost:4000";
  return raw.replace(/\/$/, "");
}
