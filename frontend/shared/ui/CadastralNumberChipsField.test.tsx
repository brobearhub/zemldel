import { useState } from "react";
import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { createEmptyCadastralParts, type CadastralNumberParts } from "@/entities/request/lib/cadastral-number";
import { CadastralNumberChipsField } from "./CadastralNumberChipsField";

function Harness() {
  const [value, setValue] = useState<CadastralNumberParts[]>([createEmptyCadastralParts()]);
  return (
    <ThemeProvider theme={createAppTheme("light")}>
      <CadastralNumberChipsField value={value} onChange={setValue} />
    </ThemeProvider>
  );
}

describe("CadastralNumberChipsField", () => {
  it("shows one masked field and turns a finished number into a chip", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByRole("textbox", { name: "Кадастровый номер" });
    expect(input).toHaveAttribute("placeholder", "66:41:0000000:000");

    await user.type(input, "6641020401612");
    expect(input).toHaveValue("66:41:0204016:12");

    await user.keyboard("{Enter}");
    expect(input).toHaveValue("");
    const chip = screen.getByText("66:41:0204016:12");
    expect(input.compareDocumentPosition(chip) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Удалить кадастровый номер 66:41:0204016:12" }));
    expect(screen.queryByText("66:41:0204016:12")).toBeNull();
  });

  it("keeps an unfinished number in the field", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByRole("textbox", { name: "Кадастровый номер" });
    await user.type(input, "6641{Enter}");
    expect(input).toHaveValue("66:41");
    expect(screen.queryByRole("button", { name: /Удалить кадастровый номер/ })).toBeNull();
  });
});
