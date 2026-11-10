import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material";
import { useMemo } from "react";
import { afterEach, vi } from "vitest";
import { createAppTheme } from "@/core/theme/createAppTheme";
import {
  COLOR_MODE_STORAGE_KEY,
  ColorModeProvider,
  useColorMode,
} from "@/core/theme/ColorModeContext";
import { ColorModeToggle } from "@/core/theme/ColorModeToggle";

function ModeProbe() {
  const { mode } = useColorMode();
  return <span>{mode}</span>;
}

function ToggleHarness() {
  const { mode } = useColorMode();
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <ColorModeToggle showLabel />
    </ThemeProvider>
  );
}

describe("ColorModeProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts in light mode", () => {
    render(
      <ColorModeProvider>
        <ModeProbe />
      </ColorModeProvider>,
    );

    expect(screen.getByText("light")).toBeInTheDocument();
  });

  it("stays light when the system prefers dark and nothing is stored", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("dark"),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })),
    );

    render(
      <ColorModeProvider>
        <ModeProbe />
      </ColorModeProvider>,
    );

    expect(screen.getByText("light")).toBeInTheDocument();
  });

  it("restores dark mode from localStorage", async () => {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, "dark");

    render(
      <ColorModeProvider>
        <ModeProbe />
      </ColorModeProvider>,
    );

    expect(await screen.findByText("dark")).toBeInTheDocument();
  });

  it("в системном режиме отслеживает изменения темы устройства", () => {
    let listener: (() => void) | undefined;
    const media = {
      matches: true,
      addEventListener: vi.fn((_event: string, callback: () => void) => { listener = callback; }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("matchMedia", vi.fn(() => media));
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, "system");
    const { unmount } = render(<ColorModeProvider><ModeProbe /></ColorModeProvider>);
    expect(screen.getByText("dark")).toBeInTheDocument();
    act(() => { media.matches = false; listener?.(); });
    expect(screen.getByText("light")).toBeInTheDocument();
    expect(window.localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe("system");
    unmount();
    expect(media.removeEventListener).toHaveBeenCalled();
  });

  it("toggles theme and persists the choice", async () => {
    const user = userEvent.setup();

    render(
      <ColorModeProvider>
        <ToggleHarness />
      </ColorModeProvider>,
    );

    const toggle = screen.getByRole("button", { name: "Включить тёмную тему" });
    await user.click(toggle);

    expect(screen.getByRole("button", { name: "Включить светлую тему" })).toBeInTheDocument();
    expect(window.localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe("dark");
  });
});
