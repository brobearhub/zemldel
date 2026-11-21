import { alpha } from "@mui/material/styles";
import { createAppTheme } from "./createAppTheme";
import { createLegacyAuthTheme } from "./legacyAuthTheme";
import { DARK_PALETTE_OPTIONS } from "./dark-palettes";

describe.each(["light", "dark"] as const)(
  "createAppTheme %s readability",
  (mode) => {
    const theme = createAppTheme(mode);

    it("keeps all text roles at least 16px at the default browser size", () => {
      for (const role of [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "subtitle1",
        "subtitle2",
        "body1",
        "body2",
        "caption",
        "overline",
        "button",
      ] as const) {
        expect(
          parseFloat(theme.typography[role].fontSize as string),
        ).toBeGreaterThanOrEqual(1);
      }
      expect(theme.typography.body1.fontSize).toBe("1.125rem");
    });

    it("uses Russian MUI hints", () => {
      expect(
        theme.components?.MuiAutocomplete?.defaultProps?.noOptionsText,
      ).toBe("Нет доступных вариантов");
      expect(theme.components?.MuiAutocomplete?.defaultProps?.loadingText).toBe(
        "Загрузка…",
      );
    });

    it("exposes the secondary background as a theme value and CSS variable", () => {
      const expected = mode === "light" ? "#cfd9ca" : "#383243";
      expect(theme.palette.background.secondary).toBe(expected);
      expect(theme.vars.palette.background.secondary).toContain(
        "--mui-palette-background-secondary",
      );
      expect(
        createAppTheme(mode, { cssVariables: false }).palette.background
          .secondary,
      ).toBe(expected);
      expect(createLegacyAuthTheme(mode).palette.background.secondary).toBe(
        expected,
      );
    });
  },
);

describe("createAppTheme restored palette", () => {
  it("uses the original light brand colors", () => {
    const theme = createAppTheme("light");

    expect(theme.palette.background.default).toBe("#f0f0e6");
    expect(theme.palette.primary.main).toBe("#a0b4a0");
    expect(theme.palette.primary.contrastText).toBe("#000000");
    expect(theme.palette.info.main).toBe("#FF4B14");
    expect(theme.palette.accent.main).toBe("#FA5018");
    expect(theme.palette.success.main).toBe("#548a5c");
    expect(theme.palette.text.secondary).toBe("#6e7471");
    expect(theme.palette.text.secondaryLight).toBe("#9c9f9a");
    expect(theme.palette.divider).toBe("#e0e0e0");
    expect(theme.custom.textColors?.footer).toBe(theme.palette.text.primary);
  });

  it("uses the original dark secondary colors", () => {
    const theme = createAppTheme("dark", { darkPalette: "turquoise-cocoa" });

    expect(theme.palette.background.secondary).toBe("#313f3e");
    expect(theme.palette.accent.main).toBe("#FA5018");
    expect(theme.palette.text.secondary).toBe(alpha("#fff", 0.5));
    expect(theme.palette.divider).toBe(alpha("#fff", 0.12));
    expect(theme.custom.textColors?.footer).toBe("#fff");
  });
});

describe("approved dark palettes", () => {
  const secondaryByPalette = {
    "lavender-graphite": "#383243",
    "warm-coal": "#373630",
    "sage-graphite": "#2f3730",
    "silver-graphite": "#353535",
    "mineral-slate": "#303a3a",
    "peat-copper": "#3b362f",
    moonstone: "#3d4343",
    "turquoise-cocoa": "#313f3e",
  } as const;

  it("uses Lavender Graphite by default", () => {
    const theme = createAppTheme("dark");
    expect(theme.palette.background.default).toBe("#1c1922");
    expect(theme.palette.background.paper).toBe("#292532");
    expect(theme.palette.primary.main).toBe("#bea9df");
    expect(theme.palette.text.primary).toBe("#f0eaf7");
    expect(theme.palette.text.secondary).toBe("#bbafcb");
    expect(theme.palette.divider).toBe("#584b6b");
  });

  it("offers the default palette first and preserves the other choices", () => {
    expect(DARK_PALETTE_OPTIONS.map(({ name }) => name)).toEqual([
      "Лавандовый графит",
      "Тёплый уголь",
      "Шалфейный графит",
      "Серебряный графит",
      "Минеральный сланец",
      "Торф и медь",
      "Лунный камень",
      "Бирюза и какао",
    ]);
  });

  it.each(DARK_PALETTE_OPTIONS)(
    "applies $name to dark mode and leaves the full light palette unchanged",
    ({ id, background, paper, primary, text, muted, divider }) => {
      const dark = createAppTheme("dark", { darkPalette: id });
      expect(dark.palette.background.default).toBe(background);
      expect(dark.palette.background.paper).toBe(paper);
      expect(dark.palette.background.secondary).toBe(secondaryByPalette[id]);
      expect(dark.palette.primary.main).toBe(primary);
      expect(dark.palette.text.primary).toBe(text);
      expect(dark.palette.text.secondary).toBe(muted);
      expect(dark.palette.divider).toBe(divider);
      expect(dark.palette.accent.main).toBe("#FA5018");
      expect(dark.palette.accent.contrastText).toBe("#fff");
      expect(dark.vars.palette.primary.main).toContain(
        "--mui-palette-primary-main",
      );

      const light = createAppTheme("light", { darkPalette: id });
      const original = createAppTheme("light");
      // Compare token data; MUI creates fresh helper functions for each theme.
      expect(JSON.stringify(light.palette)).toBe(
        JSON.stringify(original.palette),
      );
      expect(light.custom).toEqual(original.custom);
    },
  );
});
