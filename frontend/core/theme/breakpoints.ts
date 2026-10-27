/** Ширина окна. Ключи отсортирует MUI по значению в пикселях. */
export const breakpointValues = {
  xs: 0, // телефон, портрет
  sm: 600, // крупный телефон / складной / телефон в ландшафте
  tablet: 768, // планшет, портрет
  md: 900,
  lg: 1200, // ноутбук, планшет в ландшафте (1133–1376)
  xl: 1536,
  xxl: 1920, // Full HD
} as const;

/** Ориентация, высота и ввод: то, что брейкпоинты по ширине не различают. */
export const media = {
  /** Телефон в ландшафте: широкий, но очень низкий экран */
  phoneLandscape: "@media (orientation: landscape) and (max-height: 500px)",
  /** Планшет в портрете */
  tabletPortrait: "@media (orientation: portrait) and (min-width: 744px) and (max-width: 1100px)",
  /** Планшет в ландшафте: не телефон и не большой монитор */
  tabletLandscape:
    "@media (orientation: landscape) and (min-height: 501px) and (max-width: 1400px) and (pointer: coarse)",
  /** Низкий вьюпорт любого устройства: ноутбук 1366×768, открытая клавиатура */
  shortViewport: "@media (max-height: 700px)",
  /** Сенсорный ввод без hover */
  touch: "@media (hover: none) and (pointer: coarse)",
} as const;

export type AppMedia = typeof media;
