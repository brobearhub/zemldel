import { alpha } from "@mui/material/styles";
import { createAppTheme } from "./createAppTheme";
import { createLegacyAuthTheme } from "./legacyAuthTheme";

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
      expect(theme.palette.background.secondary).toBe("#a0b4a00f");
      expect(theme.vars.palette.background.secondary).toContain(
        "--mui-palette-background-secondary",
      );
      expect(
        createAppTheme(mode, { cssVariables: false }).palette.background
          .secondary,
      ).toBe("#a0b4a00f");
      expect(createLegacyAuthTheme(mode).palette.background.secondary).toBe(
        "#a0b4a00f",
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
    const theme = createAppTheme("dark");

    expect(theme.palette.accent.main).toBe("#FA5018");
    expect(theme.palette.text.secondary).toBe(alpha("#fff", 0.5));
    expect(theme.palette.divider).toBe(alpha("#fff", 0.12));
    expect(theme.custom.textColors?.footer).toBe("#fff");
  });
});
