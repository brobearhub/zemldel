import { createAppTheme } from "./createAppTheme";
import { createLegacyAuthTheme } from "./legacyAuthTheme";
import { DARK_PALETTE_OPTIONS } from "./dark-palettes";
import { preservesAuthAppearance } from "@/shared/config/preserved-auth-appearance";

describe("preserved auth appearance", () => {
  it("excludes only signin and signup from the typography migration", () => {
    expect(preservesAuthAppearance("/signin")).toBe(true);
    expect(preservesAuthAppearance("/signup")).toBe(true);
    for (const route of [
      null,
      "/",
      "/forgot-password",
      "/reset-password",
      "/profile",
      "/signin-extra",
    ]) {
      expect(preservesAuthAppearance(route)).toBe(false);
    }
  });

  it("retains the original auth palette, sizes and floating labels", () => {
    const theme = createLegacyAuthTheme("light");
    expect(theme.palette.primary.main).toBe("#a0b4a0");
    expect(theme.palette.info.main).toBe("#FF4B14");
    expect(theme.typography.body1.fontSize).toBe("1rem");
    expect(theme.typography.body2.fontSize).toBe("0.875rem");
    expect(
      theme.components?.MuiInputLabel?.defaultProps?.shrink,
    ).toBeUndefined();
    expect(createAppTheme("light").typography.body1.fontSize).toBe("1.125rem");
  });
  it.each(DARK_PALETTE_OPTIONS)(
    "uses the selected $name palette for auth pages",
    ({ id }) => {
      const site = createAppTheme("dark", { darkPalette: id });
      const auth = createLegacyAuthTheme("dark", { darkPalette: id });
      expect(auth.palette.background).toEqual(site.palette.background);
      expect(auth.palette.primary).toEqual(site.palette.primary);
      expect(auth.palette.text).toEqual(site.palette.text);
      expect(auth.palette.divider).toBe(site.palette.divider);
      expect(auth.custom.bgColors).toEqual(site.custom.bgColors);
      expect(auth.custom.preserveAuthAppearance).toBe(true);
    },
  );

});
