import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { createAppTheme } from "@/core/theme/createAppTheme";
import AppError from "./error";

vi.mock("next/image", () => ({
  default: (props: { alt?: string }) => <img alt={props.alt ?? ""} />,
}));

function renderError(error: Error) {
  return render(
    <ThemeProvider theme={createAppTheme("light")}>
      <AppError error={error} reset={() => undefined} />
    </ThemeProvider>,
  );
}

describe("AppError", () => {
  it("shows maintenance copy for backend 500", () => {
    renderError(new Error("Backend request failed with status 500"));
    expect(screen.getByRole("heading", { name: "Ведутся технические работы" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Обновить страницу" })).toBeInTheDocument();
  });

  it("shows soft generic copy for unexpected errors", () => {
    renderError(new Error("Cannot read properties of undefined"));
    expect(screen.getByRole("heading", { name: "Что-то пошло не так" })).toBeInTheDocument();
  });
});
