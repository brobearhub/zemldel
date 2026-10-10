/** Публичные CDN. Если браузер их не открыл, тот же ключ читается из Object Storage. */
export const PUBLIC_CDN_HOSTS = ["cdn.zemledel.pro", "cdn.zemledelpro.ru"] as const;

export type DevStorageConfig = {
  endpoint: string;
  bucket: string;
  forcePathStyle: boolean;
};

const HOSTS = new Set<string>(PUBLIC_CDN_HOSTS);

function publicStorageConfig(): DevStorageConfig | null {
  const endpoint = process.env.NEXT_PUBLIC_YA_S3_ENDPOINT?.trim() ?? "";
  const bucket = process.env.NEXT_PUBLIC_YA_S3_PUBLIC_BUCKET?.trim() ?? "";
  if (!endpoint || !bucket) return null;
  return {
    endpoint,
    bucket,
    forcePathStyle: process.env.NEXT_PUBLIC_YA_S3_FORCE_PATH_STYLE === "true",
  };
}

/** Собирает URL объекта в Object Storage. */
export function devStorageObjectUrl(config: DevStorageConfig, key: string): string {
  const encodedKey = key
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const endpoint = config.endpoint.replace(/\/+$/, "");
  if (config.forcePathStyle) {
    return `${endpoint}/${encodeURIComponent(config.bucket)}/${encodedKey}`;
  }
  const origin = new URL(endpoint);
  return `${origin.protocol}//${config.bucket}.${origin.host}/${encodedKey}`;
}

/**
 * Тот же ключ, что у CDN, но на публичном бакете.
 * Why: CDN с dev-машины часто не открывается, объект в Storage при этом читается анонимно.
 * Чужие адреса и локальные превью не подменяются. Без env фолбека нет.
 */
export function storageFallbackSrc(url: string): string | null {
  const config = publicStorageConfig();
  if (!config) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" || !HOSTS.has(parsed.hostname)) return null;

  const key = parsed.pathname.replace(/^\/+/, "");
  if (!key.startsWith("public/")) return null;

  const target = devStorageObjectUrl(config, key);
  return parsed.search ? `${target}${parsed.search}` : target;
}
