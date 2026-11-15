import type { Theme } from "@mui/material/styles";

/** Адаптивный CSS-фон через стандартный оптимизатор Next.js. */
export function authBackground(src: string) {
  const encoded = encodeURIComponent(src);
  const image = (width: number) =>
    `url("/_next/image?url=${encoded}&w=${width}&q=75")`;

  return {
    xs: image(1080),
    md: image(1920),
    xl: image(3840),
  };
}

export function themedAuthBackground(theme: Theme) {
  return authBackground(
    theme.palette.mode === "dark"
      ? "/hero-bg-house_static.jpg"
      : "/hero-bg-house_static_day.jpg",
  );
}
