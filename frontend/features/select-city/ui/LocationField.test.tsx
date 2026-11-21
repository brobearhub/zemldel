import { StrictMode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { LocationField } from "./LocationField";

vi.mock("../model/load-regional-capitals", () => ({
  loadRegionalCapitals: async () => [],
  suggestCities: async () => [],
}));

it("continues typing in the city dialog and keeps the previous selection on Escape", async () => {
  Element.prototype.scrollTo = vi.fn();
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <StrictMode>
      <LocationField
        label="Выберите город"
        value={{
          id: "1",
          name: "Казань",
          regionCode: "16",
          regionName: "Татарстан",
          displayName: "Казань",
        }}
        onChange={onChange}
        typeToSearch
      />
    </StrictMode>,
  );
  const button = screen.getByRole("button", { name: "Казань" });
  button.focus();
  fireEvent.keyDown(button, { key: "Е" });
  const search = await screen.findByRole("textbox", { name: "Поиск города" });
  expect(search).toHaveFocus();
  await user.keyboard("ка");
  expect(search).toHaveValue("Ека");
  await user.keyboard("{Escape}");
  expect(onChange).not.toHaveBeenCalled();
  expect(button).toHaveFocus();
});
