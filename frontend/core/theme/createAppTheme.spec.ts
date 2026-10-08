import { createAppTheme } from "./createAppTheme";

describe("createAppTheme light palette", () => {
  it("uses SOMO cream header, sage primary/footer, orange info, disabled hex", () => {
    const theme = createAppTheme("light");

    expect(theme.palette.background.default).toBe("#f0f0e6");
    expect(theme.custom.bgColors.header).toBe("#f0f0e6");
    expect(theme.custom.bgColors.secondary).toBe("#a0b4a0");
    expect(theme.palette.primary.main).toBe("#a0b4a0");
    expect(theme.palette.primary.contrastText).toBe("#000000");
    expect(theme.palette.secondary.main).toBe("#000000");
    expect(theme.palette.info.main).toBe("#FF4B14");
    expect(theme.palette.accent.main).toBe("#FA5018");
    expect(theme.palette.accent.contrastText).toBe("#fff");
    expect(theme.palette.success.main).toBe("#548a5c");
    expect(theme.palette.text.primary).toBe("#325e49");
    expect(theme.palette.text.secondary).toBe("#6e7471");
    expect(theme.palette.text.secondaryLight).toBe("#9c9f9a");
  });
});
