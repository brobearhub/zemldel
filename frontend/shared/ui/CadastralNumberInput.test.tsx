import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material";
import { createAppTheme } from "@/core/theme/createAppTheme";
import type { CadastralNumberParts } from "@/entities/request/lib/cadastral-number";
import { CadastralNumberInput } from "./CadastralNumberInput";

function Field({ size }: { size?: "small" | "medium" }) {
  const [value, setValue] = useState<CadastralNumberParts>(["", "", "", ""]);
  return (
    <ThemeProvider theme={createAppTheme("light")}>
      <CadastralNumberInput
        size={size}
        value={value}
        onChange={setValue}
      />
    </ThemeProvider>
  );
}

it("respects the requested input size", () => {
  const { rerender } = render(<Field />);
  const input = screen.getByRole("textbox", { name: "Кадастровый номер, часть 1" });
  const mediumPadding = parseFloat(getComputedStyle(input).paddingTop);
  rerender(<Field size="small" />);
  expect(parseFloat(getComputedStyle(input).paddingTop)).toBeLessThan(mediumPadding);
  expect(parseFloat(getComputedStyle(input.parentElement!).minHeight) || 0).toBe(0);
});

it("keeps digit filtering and keyboard focus between cadastral parts", async () => {
  render(<Field size="small" />);
  const user = userEvent.setup();
  const first = screen.getByRole("textbox", { name: "Кадастровый номер, часть 1" });
  const second = screen.getByRole("textbox", { name: "Кадастровый номер, часть 2" });
  await user.type(first, "x66");
  expect(first).toHaveValue("66");
  expect(second).toHaveFocus();
  await user.keyboard("{Backspace}");
  expect(first).toHaveFocus();
  expect(first).toHaveAttribute("inputmode", "numeric");
  expect(first).toHaveAttribute("maxlength", "2");
});
