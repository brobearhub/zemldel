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
