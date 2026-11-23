import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuideScreenshot } from "./GuideScreenshot";

it("открывает оригинал в модальном окне и возвращает фокус к снимку при закрытии", async () => {
  const user = userEvent.setup();
  const source = { src: "/client-card.webp", width: 1464, height: 970 };
  render(<GuideScreenshot source={source} alt="Карточка Анны" caption="Карточка клиента" />);

  const thumbnail = screen.getByRole("button", { name: /Увеличить снимок/ });
  await user.click(thumbnail);
  const dialog = within(screen.getByRole("dialog", { name: "Карточка клиента" }));
  expect(dialog.getByRole("img", { name: "Карточка Анны" })).toHaveAttribute("src", source.src);

  await user.click(dialog.getByRole("button", { name: "Показать в исходном размере" }));
  expect(dialog.getByRole("img")).toHaveAttribute("data-original");
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(thumbnail).toHaveFocus();

  await user.keyboard("{Enter}");
  const reopened = within(screen.getByRole("dialog", { name: "Карточка клиента" }));
  expect(reopened.getByRole("img")).not.toHaveAttribute("data-original");
});
