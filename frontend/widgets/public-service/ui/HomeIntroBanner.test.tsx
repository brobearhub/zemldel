import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@mui/material";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { HomeIntroBanner } from "./HomeIntroBanner";

describe("HomeIntroBanner", () => {
  it("keeps headings in semantic order with their requested attributes", () => {
    render(<HomeIntroBanner onCreateRequest={() => {}} />);

    const headings = screen.getAllByRole("heading");

    expect(headings.map((heading) => heading.tagName)).toEqual([
      "H1",
      "H2",
      "H3",
      "H4",
    ]);
    expect(headings.map((heading) => heading.textContent)).toEqual([
      "Земледел",
      "Земельные и кадастровые услуги",
      "ЗЕМЛЯ • УЧАСТОК • ДОКУМЕНТЫ",
      "Найдите своего специалиста",
    ]);
    expect(headings.map((heading) => heading.getAttribute("title"))).toEqual([
      "земледел",
      "Земельные и кадастровые услуги",
      "ЗЕМЛЯ, УЧАСТОК, ДОКУМЕНТЫ",
      "Найдите своего специалиста",
    ]);
    for (const heading of headings) {
      const description = heading.getAttribute("description");
      expect(description).toBeTruthy();
      expect(screen.queryByText(description!)).not.toBeInTheDocument();
    }
    expect(screen.getByRole("region", { name: "Земледел" })).toBeInTheDocument();
  });

  it.each([
    ["warm-coal", "rgb(55, 54, 48)"],
    ["sage-graphite", "rgb(47, 55, 48)"],
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
