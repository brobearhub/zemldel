import { forwardRef } from "react";
import { ThemeProvider } from "@mui/material";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { CadastralNumberMapLink } from "./CadastralNumberMapLink";

vi.mock("next/link", () => ({
  __esModule: true,
  default: forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(
    function NextLink({ href, children, ...props }, ref) {
      return (
        <a ref={ref} href={typeof href === "string" ? href : ""} {...props}>
          {children}
        </a>
      );
    },
  ),
}));

const NSPD_HREF =
  "https://nspd.gov.ru/map?thematic=PKK&query=66%3A41%3A0110176%3A18&theme_id=1&is_copy_url=true";

describe("CadastralNumberMapLink", () => {
  it("opens the NSPD map in a new tab and shows the tooltip link", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider theme={createAppTheme("light")}>
        <CadastralNumberMapLink value="66:41:0110176:18" />
      </ThemeProvider>,
    );

    const numberLink = screen.getByRole("link", { name: "66:41:0110176:18" });
    expect(numberLink).toHaveAttribute("href", NSPD_HREF);
    expect(numberLink).toHaveAttribute("target", "_blank");
    expect(numberLink).toHaveAttribute("rel", "noopener noreferrer");

    await user.hover(numberLink);

    const tooltip = await screen.findByRole("tooltip");
    const tooltipLink = within(tooltip).getByRole("link", { name: "перейти на сайт" });
    expect(tooltipLink).toHaveAttribute("href", NSPD_HREF);
    expect(tooltipLink).toHaveAttribute("target", "_blank");
    expect(tooltipLink).toHaveAttribute("rel", "noopener noreferrer");
  });
});
