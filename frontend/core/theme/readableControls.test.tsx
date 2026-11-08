import { render, screen } from "@testing-library/react";
import {
  Button,
  Chip,
  CssBaseline,
  TextField,
  ThemeProvider,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { createAppTheme } from "./createAppTheme";

function fontPixels(element: Element) {
  // jsdom leaves an inherited font-size unresolved on a Chip's label span.
  for (let node: Element | null = element; node; node = node.parentElement) {
    const value = getComputedStyle(node).fontSize;
    if (Number.isFinite(parseFloat(value))) {
      return parseFloat(value) * (value.endsWith("rem") ? 16 : 1);
    }
  }
  return Number.NaN;
}

describe("readable compact controls", () => {
  it("keeps small MUI controls at least 16px after component defaults are applied", () => {
    render(
      <ThemeProvider theme={createAppTheme("light")}>
        <Button size="small">Продолжить</Button>
        <ToggleButtonGroup size="small" value="date">
          <ToggleButton value="date">По дате</ToggleButton>
          <ToggleButton value="request">По заявкам</ToggleButton>
        </ToggleButtonGroup>
        <Chip size="small" label="Выбранный город" />
      </ThemeProvider>,
    );
    for (const label of [
      "Продолжить",
      "По дате",
      "По заявкам",
      "Выбранный город",
    ]) {
      expect(fontPixels(screen.getByText(label))).toBeGreaterThanOrEqual(16);
    }
  });

  it("keeps a filled field label readable instead of scaling it down", () => {
    render(
      <ThemeProvider theme={createAppTheme("light")}>
        <TextField label="Описание задачи" value="Текст" onChange={() => {}} />
      </ThemeProvider>,
    );
    const label = document.querySelector("label")!;
    expect(fontPixels(label)).toBeGreaterThanOrEqual(16);
    expect(getComputedStyle(label).transform).toBe("none");
    expect(getComputedStyle(label).position).toBe("static");
  });

  it.each(["light", "dark"] as const)(
    "respects input sizes without imposing a minimum height in %s mode",
    (mode) => {
      render(
        <ThemeProvider theme={createAppTheme(mode)}>
          <CssBaseline />
          <TextField label="Телефон" size="small" />
          <TextField label="Обычное поле" />
        </ThemeProvider>,
      );
      const small = screen.getByLabelText("Телефон");
      const regular = screen.getByLabelText("Обычное поле");
      const smallRoot = small.closest(".MuiOutlinedInput-root")!;
      const regularRoot = regular.closest(".MuiOutlinedInput-root")!;

      expect(fontPixels(smallRoot)).toBe(16);
      expect(fontPixels(regularRoot)).toBe(18);
      expect(parseFloat(getComputedStyle(smallRoot).minHeight) || 0).toBe(0);
      expect(parseFloat(getComputedStyle(regularRoot).minHeight) || 0).toBe(0);
    },
  );
});
