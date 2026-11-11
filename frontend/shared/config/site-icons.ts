export const SITE_ICON_VERSION = "briefcase-1";

export function siteIconUrl(filename: string): string {
  return `/${filename}?v=${SITE_ICON_VERSION}`;
}
