import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { ResponsiveLabel } from "./ResponsiveLabel";

function renderLabel(text: string, compactText?: string | null) {
  return render(
    <ThemeProvider theme={createAppTheme("light")}>
      <ResponsiveLabel text={text} compactText={compactText} />
    </ThemeProvider>,
  );
}

describe("ResponsiveLabel", () => {
  it("renders the short label for narrow screens and the full label from md", () => {
    renderLabel("Землеустройство и кадастр", "Кадастр");

    expect(screen.getByText("Кадастр")).toBeInTheDocument();
    expect(screen.getByText("Землеустройство и кадастр")).toBeInTheDocument();
  });

  it("renders the full label once when the short label is missing or the same", () => {
    const { rerender } = renderLabel("Судебные споры", "  ");
    expect(screen.getAllByText("Судебные споры")).toHaveLength(1);

    rerender(
      <ThemeProvider theme={createAppTheme("light")}>
        <ResponsiveLabel text="Прочее" compactText="Прочее" />
      </ThemeProvider>,
    );
    expect(screen.getAllByText("Прочее")).toHaveLength(1);
  });
});
