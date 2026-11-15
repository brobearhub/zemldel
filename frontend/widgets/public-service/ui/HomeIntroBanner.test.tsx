import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@mui/material";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { HomeIntroBanner } from "./HomeIntroBanner";

describe("HomeIntroBanner", () => {
  it.each([
    ["warm-coal", "rgb(58, 53, 44)"],
    ["sage-graphite", "rgb(45, 55, 47)"],
  ] as const)("uses the selected dark palette %s", (palette, background) => {
    const theme = createAppTheme("dark", {
      cssVariables: false,
      darkPalette: palette,
    });
    render(
      <ThemeProvider theme={theme}>
        <HomeIntroBanner onCreateRequest={() => {}} />
      </ThemeProvider>,
    );

    expect(
      getComputedStyle(screen.getByRole("region")).backgroundColor,
    ).toBe(background);
  });

  it("открывает форму по нажатию на карточку своей заявки", () => {
    const onCreateRequest = vi.fn();
    render(<HomeIntroBanner onCreateRequest={onCreateRequest} />);

    fireEvent.click(screen.getByText("Сравните отклики и выберите одного исполнителя"));

    expect(onCreateRequest).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: /Своя заявка/ })).toBeTruthy();
    expect(screen.getByText("Каталог услуг").closest("a, button")).toBeNull();
  });
});
