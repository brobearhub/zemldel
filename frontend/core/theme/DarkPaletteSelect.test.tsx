import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "@mui/material";
import { useMemo } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ColorModeProvider, useColorMode } from "./ColorModeContext";
import { createAppTheme } from "./createAppTheme";
import { DarkPaletteSelect } from "./DarkPaletteSelect";
import { DARK_PALETTE_STORAGE_KEY } from "./dark-palettes";

function PaletteProbe() {
  const theme = useTheme();
  const { mode, preference, darkPalette, toggleMode } = useColorMode();
  return (
    <>
      <output data-testid="palette">
        {mode}/{preference}/{darkPalette}/{theme.palette.primary.main}
      </output>
      <button onClick={toggleMode}>Переключить режим</button>
    </>
  );
}

function Harness({ compact = false }: { compact?: boolean }) {
  const { mode, darkPalette } = useColorMode();
  const theme = useMemo(
    () => createAppTheme(mode, { darkPalette, cssVariables: false }),
    [mode, darkPalette],
  );
  return (
    <ThemeProvider theme={theme}>
      <DarkPaletteSelect compact={compact} />
      <PaletteProbe />
    </ThemeProvider>
  );
}

const mount = (compact = false) =>
  render(
    <ColorModeProvider>
      <Harness compact={compact} />
    </ColorModeProvider>,
  );

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("dark palette selection", () => {
  it("uses Lavender Graphite in dark mode on the first visit", () => {
    mount();
    expect(screen.getByTestId("palette")).toHaveTextContent(
      "dark/dark/lavender-graphite/#bea9df",
    );
  });

  it("restores the selected palette and keeps it across light/dark switches and remounts", async () => {
    localStorage.setItem("color-mode", "dark");
    localStorage.setItem(DARK_PALETTE_STORAGE_KEY, "warm-coal");
    const user = userEvent.setup();
    const view = mount();
    expect(screen.getByTestId("palette")).toHaveTextContent(
      "dark/dark/warm-coal/#b1b8a0",
    );
    await user.click(screen.getByRole("combobox", { name: "Тёмная палитра" }));
    expect(screen.getAllByRole("option")).toHaveLength(8);
    expect(screen.getAllByRole("option")[0]).toHaveTextContent("Лавандовый графит");
    await user.click(screen.getByRole("option", { name: "Лавандовый графит По умолчанию" }));
    expect(screen.getByTestId("palette")).toHaveTextContent(
      "dark/dark/lavender-graphite/#bea9df",
    );
    expect(localStorage.getItem(DARK_PALETTE_STORAGE_KEY)).toBe(
      "lavender-graphite",
    );
    await user.click(screen.getByRole("button", { name: "Переключить режим" }));
    expect(screen.getByTestId("palette")).toHaveTextContent(
      "light/light/lavender-graphite/#a0b4a0",
    );
    await user.click(screen.getByRole("button", { name: "Переключить режим" }));
    view.unmount();
    mount();
    expect(screen.getByTestId("palette")).toHaveTextContent(
      "dark/dark/lavender-graphite/#bea9df",
    );
  });

  it("supports the compact sidebar menu", async () => {
    localStorage.setItem("color-mode", "dark");
    const user = userEvent.setup();
    mount(true);
    await user.click(
      screen.getByRole("button", { name: "Тёмная палитра: Лавандовый графит" }),
    );
    expect(screen.getAllByRole("menuitem")[0]).toHaveTextContent("Лавандовый графит");
    await user.click(screen.getByRole("menuitem", { name: "Бирюза и какао" }));
    expect(screen.getByTestId("palette")).toHaveTextContent(
      "dark/dark/turquoise-cocoa/#80cbc4",
    );
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it.each([
    "__proto__",
    "deep-forest",
    "smoky-sage",
    "green-ink",
    "pine-dusk",
  ])("falls back to Lavender Graphite for unavailable stored palette %s", (palette) => {
    localStorage.setItem("color-mode", "dark");
    localStorage.setItem(DARK_PALETTE_STORAGE_KEY, palette);
    mount();
    expect(screen.getByTestId("palette")).toHaveTextContent(
      "dark/dark/lavender-graphite/#bea9df",
    );
  });

  it("keeps the selected palette when system appearance changes", async () => {
    let listener: (() => void) | undefined;
    const media = {
      matches: true,
      addEventListener: vi.fn((_event: string, callback: () => void) => {
        listener = callback;
      }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => media),
    );
    localStorage.setItem("color-mode", "system");
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("combobox", { name: "Тёмная палитра" }));
    await user.click(screen.getByRole("option", { name: "Лунный камень" }));
    expect(screen.getByTestId("palette")).toHaveTextContent(
      "dark/system/moonstone/#b6c7bb",
    );
    act(() => {
      media.matches = false;
      listener?.();
    });
    expect(screen.getByTestId("palette")).toHaveTextContent(
      "light/system/moonstone/#a0b4a0",
    );
    act(() => {
      media.matches = true;
      listener?.();
    });
    expect(screen.getByTestId("palette")).toHaveTextContent(
      "dark/system/moonstone/#b6c7bb",
    );
    expect(localStorage.getItem("color-mode")).toBe("system");
  });

  it("lets users change palettes when localStorage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Unavailable");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Unavailable");
    });
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("combobox", { name: "Тёмная палитра" }));
    await user.click(screen.getByRole("option", { name: "Серебряный графит" }));
    expect(screen.getByTestId("palette")).toHaveTextContent(
      "dark/dark/silver-graphite/#c2c2c2",
    );
  });
});
