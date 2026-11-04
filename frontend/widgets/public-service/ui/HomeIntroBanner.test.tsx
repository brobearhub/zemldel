import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeIntroBanner } from "./HomeIntroBanner";

describe("HomeIntroBanner", () => {
  it("открывает форму по нажатию на карточку своей заявки", () => {
    const onCreateRequest = vi.fn();
    render(<HomeIntroBanner onCreateRequest={onCreateRequest} />);

    fireEvent.click(screen.getByText("Сравните отклики и выберите одного исполнителя"));

    expect(onCreateRequest).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: /Своя заявка/ })).toBeTruthy();
    expect(screen.getByText("Каталог услуг").closest("a, button")).toBeNull();
  });
});
