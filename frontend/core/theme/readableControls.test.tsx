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
  it.each(["light", "dark"] as const)(
    "lets MUI button sizes determine typography and padding in %s mode",
    (mode) => {
      const sizes = ["small", "medium", "large"] as const;
      const variants = ["text", "outlined", "contained"] as const;
      render(
        <ThemeProvider theme={createAppTheme(mode)}>
          {variants.map((variant) => sizes.map((size) => (
            <Button
              key={`${variant}-${size}`}
              variant={variant}
              size={size}
            >
              {`${variant}-${size}`}
            </Button>
          )))}
          {sizes.map((size) => (
            <ToggleButtonGroup
              key={size}
              size={size}
              value="date"
            >
              <ToggleButton value="date">{`toggle-${size}`}</ToggleButton>
            </ToggleButtonGroup>
          ))}
        </ThemeProvider>,
      );
      for (const variant of [...variants, "toggle"]) {
        const buttons = sizes.map((size) =>
          screen.getByRole("button", { name: `${variant}-${size}` }),
        );
        const padding = buttons.map((button) =>
          parseFloat(getComputedStyle(button).paddingTop),
        );
        expect(padding[0]).toBeLessThan(padding[1]);
        expect(padding[1]).toBeLessThan(padding[2]);
        expect(fontPixels(buttons[0])).toBeLessThan(fontPixels(buttons[1]));
        expect(fontPixels(buttons[1])).toBeLessThan(fontPixels(buttons[2]));
        for (const button of buttons) {
          expect(parseFloat(getComputedStyle(button).minHeight) || 0).toBe(0);
        }
      }
    },
  );

  it("keeps compact chip labels readable", () => {
    render(
      <ThemeProvider theme={createAppTheme("light")}>
        <Chip size="small" label="Выбранный город" />
      </ThemeProvider>,
    );
    expect(fontPixels(screen.getByText("Выбранный город"))).toBeGreaterThanOrEqual(16);
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
