import { render, screen, within } from "@testing-library/react";
import { fetchBackendJson } from "@/shared/api/backend/server";
import AboutPage from "./page";

vi.mock("@/shared/api/backend/server", () => ({ fetchBackendJson: vi.fn() }));

describe("руководство для исполнителей на странице о проекте", () => {
  it("доступно из блока исполнителей при сбое каталога", async () => {
    vi.mocked(fetchBackendJson).mockRejectedValueOnce(new Error("Каталог недоступен"));
    render(await AboutPage());

    const guide = { name: "Возможности кабинета исполнителя" };
    const providers = within(screen.getByRole("region", { name: /Для исполнителей/ }));
    const customers = within(screen.getByRole("region", { name: /Для клиентов/ }));
    expect(providers.getByRole("link", guide)).toHaveAttribute("href", "/for-providers");
    expect(customers.queryByRole("link", guide)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Список категорий услуг временно недоступен");
  });

  it("показывает направления услуг при доступном каталоге", async () => {
    vi.mocked(fetchBackendJson).mockResolvedValueOnce([
      { id: "survey", slug: "survey", name: "Межевание", parentId: null, sortOrder: 1 },
    ]);
    render(await AboutPage());

    expect(screen.getByRole("link", { name: "Межевание" })).toHaveAttribute("href", "/service-categories/survey");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
