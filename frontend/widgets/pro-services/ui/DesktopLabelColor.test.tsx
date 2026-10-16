import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { DesktopLabelColor } from "./DesktopLabelColor";

describe("DesktopLabelColor", () => {
  it("показывает один цвет и открывает вертикальное меню", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ThemeProvider theme={createAppTheme("light")}>
        <DesktopLabelColor value="primary" disabled={false} onChange={onChange} />
      </ThemeProvider>,
    );

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("menu")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Цвет метки" }));

    const menu = screen.getByRole("menu");
    expect(getComputedStyle(menu).flexDirection).toBe("column");
    expect(screen.getAllByRole("menuitem")).toHaveLength(6);

    await user.click(screen.getByRole("menuitem", { name: "error" }));

    expect(onChange).toHaveBeenCalledWith("error");
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
