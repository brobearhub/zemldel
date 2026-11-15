/** Approved Subframe palettes. Keep these names independent of canvas numbering. */
export const DARK_PALETTES = {
  "warm-coal": {
    name: "Тёплый уголь",
    background: "#1d1b18",
    paper: "#2c2924",
    raised: "#3a352c",
    text: "#f0ece1",
    muted: "#bdb6a7",
    primary: "#b1b8a0",
    divider: "#575144",
    info: "#ff8b66",
    error: "#f1a09a",
  },
  "sage-graphite": {
    name: "Шалфейный графит",
    background: "#171c19",
    paper: "#222a25",
    raised: "#2d372f",
    text: "#e4ebe3",
    muted: "#a5b0a6",
    primary: "#a0b4a0",
    divider: "#425047",
    info: "#ff8b66",
    error: "#f1a09a",
  },
  "silver-graphite": {
    name: "Серебряный графит",
    background: "#171717",
    paper: "#252525",
    raised: "#343434",
    text: "#efefef",
    muted: "#b5b5b5",
    primary: "#c2c2c2",
    contrastText: "#171717",
    divider: "#505050",
    info: "#ff8b66",
    error: "#f1a09a",
  },
  "lavender-graphite": {
    name: "Лавандовый графит",
    background: "#1c1922",
    paper: "#292532",
    raised: "#3a3347",
    text: "#f0eaf7",
    muted: "#bbafcb",
    primary: "#bea9df",
    contrastText: "#21172f",
    divider: "#584b6b",
    info: "#ff8b66",
    error: "#f1a09a",
  },
  "mineral-slate": {
    name: "Минеральный сланец",
    background: "#181e21",
    paper: "#252e31",
    raised: "#323e40",
    text: "#e3ebea",
    muted: "#a7b7b9",
    primary: "#a3bcb2",
    divider: "#485c5f",
    info: "#ff8b66",
    error: "#f1a09a",
  },
  "peat-copper": {
    name: "Торф и медь",
    background: "#211b18",
    paper: "#312822",
    raised: "#42362b",
    text: "#f1e9dd",
    muted: "#c2b3a2",
    primary: "#b5b79d",
    divider: "#61503f",
    info: "#ff8b66",
    error: "#f1a09a",
  },
  moonstone: {
    name: "Лунный камень",
    background: "#24272a",
    paper: "#32383b",
    raised: "#41494c",
    text: "#ecf0ed",
    muted: "#b6c1c0",
    primary: "#b6c7bb",
    divider: "#5c6b6b",
    info: "#ffad8b",
    error: "#f5b0a9",
  },
  "turquoise-cocoa": {
    name: "Бирюза и какао",
    background: "#212121",
    paper: "#424242",
    raised: "#2c3535",
    text: "#bcaaa4",
    muted: "rgba(255, 255, 255, 0.5)",
    primary: "#80cbc4",
    divider: "rgba(255, 255, 255, 0.12)",
    info: "#ffab91",
    error: "#ef9a9a",
  },
} as const;

export type DarkPaletteId = keyof typeof DARK_PALETTES;

export const DEFAULT_DARK_PALETTE: DarkPaletteId = "warm-coal";
export const DARK_PALETTE_STORAGE_KEY = "dark-palette";
export const DARK_PALETTE_OPTIONS = Object.entries(DARK_PALETTES).map(
  ([id, palette]) => ({ id: id as DarkPaletteId, ...palette }),
);

export function isDarkPaletteId(value: unknown): value is DarkPaletteId {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(DARK_PALETTES, value)
  );
}
