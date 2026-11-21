import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { findPermittedUse } from "@/entities/land/permitted-uses";
import { LandPermittedUsesField } from "./LandPermittedUsesField";

function checkbox(code: string) {
  const row = screen.getByRole("treeitem", {
    name: `${code} ${findPermittedUse(code)?.name}`,
  });
  return within(row).getAllByRole("checkbox", { hidden: true })[0];
}

it("keeps each official code independent and discards unconfirmed changes", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <LandPermittedUsesField
      value={["2.1", "Из старого акта"]}
      disabled={false}
      onChange={onChange}
    />,
  );
  const trigger = screen.getByLabelText("ВРИ по документам");
  await user.click(trigger);
  const dialog = within(screen.getByRole("dialog"));
  const parent = dialog.getByRole("treeitem", { name: "2.0 Жилая застройка" });
  const parentBox = checkbox("2.0");
  expect(parent).toHaveAttribute("aria-checked", "false");
  expect(parentBox).not.toBePartiallyChecked();
  const child = checkbox("2.1");
  expect(child).toBeChecked();
  await user.click(parentBox);
  await user.click(child);
  expect(parentBox).toBeChecked();
  expect(child).not.toBeChecked();
  expect(checkbox("2.4")).not.toBeChecked();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(onChange).not.toHaveBeenCalled();
  await user.click(trigger);
  expect(checkbox("2.1")).toBeChecked();
  expect(checkbox("2.0")).not.toBeChecked();
  await user.click(screen.getByRole("button", { name: "Отмена" }));
  expect(onChange).not.toHaveBeenCalled();
});

it("rejects oversized additions together and keeps old values when adding across search results", async () => {
  const user = userEvent.setup();
  const initial = [
    "13.2",
    ...Array.from({ length: 18 }, (_, i) => `Из выписки ${i}`),
  ];
  const onChange = vi.fn();
  render(
    <LandPermittedUsesField
      value={initial}
      disabled={false}
      onChange={onChange}
    />,
  );
  await user.click(screen.getByLabelText("ВРИ по документам"));
  const dialog = within(screen.getByRole("dialog"));
  const search = dialog.getByRole("textbox", {
    name: "Поиск по классификатору ВРИ",
  });
  fireEvent.change(search, { target: { value: "лпх" } });
  await user.click(checkbox("1.16"));
  await user.click(checkbox("2.2"));
  expect(dialog.getByRole("alert")).toHaveTextContent("до 20 ВРИ");
  expect(checkbox("2.2")).not.toBeChecked();
  await user.click(checkbox("1.16"));
  await user.click(dialog.getByRole("tab", { name: "Свой ВРИ" }));
  const custom = dialog.getByLabelText("Формулировка из документов");
  fireEvent.change(custom, { target: { value: "я".repeat(301) } });
  await user.click(dialog.getByRole("button", { name: "Применить" }));
  expect(dialog.getByRole("alert")).toHaveTextContent("до 300 символов");
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.change(custom, { target: { value: "13.2\nПо старому плану" } });
  await user.click(dialog.getByRole("button", { name: "Применить" }));
  expect(onChange).toHaveBeenCalledExactlyOnceWith([
    ...initial,
    "По старому плану",
  ]);
});
