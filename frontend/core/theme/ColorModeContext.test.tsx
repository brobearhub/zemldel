import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material";
import { useMemo } from "react";
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

  it("starts in light mode", () => {
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
