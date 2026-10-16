import { useState } from "react";
import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { STOCK_BADGE_SUGGESTIONS } from "../lib/stock-badge-suggestions";
import { StockBadgeField } from "./StockBadgeField";

function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <ThemeProvider theme={createAppTheme("light")}>
      <StockBadgeField value={value} onChange={setValue} />
    </ThemeProvider>
  );
}

describe("StockBadgeField", () => {
  it("показывает готовые фразы при фокусе", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("combobox", { name: "Метка" }));

    expect(screen.getAllByRole("option")).toHaveLength(STOCK_BADGE_SUGGESTIONS.length);
    expect(screen.getByRole("option", { name: "Есть свободные даты" })).toBeVisible();
    expect(screen.getByRole("option", { name: "Фиксированная цена" })).toBeVisible();
    expect(getComputedStyle(screen.getByRole("listbox")).flexDirection).toBe("column");
  });

  it("подставляет выбранную фразу в поле", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("combobox", { name: "Метка" }));
    await user.click(screen.getByRole("option", { name: "Под ключ" }));

    expect(screen.getByRole("combobox", { name: "Метка" })).toHaveValue("Под ключ");
  });

  it("сужает список по набору и оставляет свой текст", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByRole("combobox", { name: "Метка" });
    await user.click(input);
    await user.type(input, "гар");

    expect(screen.getByRole("option", { name: "С гарантией" })).toBeVisible();
    expect(screen.queryByRole("option", { name: "Под ключ" })).toBeNull();

    await user.clear(input);
    await user.type(input, "Своя пометка");

    expect(input).toHaveValue("Своя пометка");
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
