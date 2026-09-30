import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ServicesAdminClient } from "./ServicesAdminClient";
import { legalService, mainService } from "../../../tests/fixtures/services";
import type { ReactElement } from "react";
import { ConfirmProvider } from "@/shared/ui/confirm";

const mockPush = vi.fn();
let fetchMock: ReturnType<typeof vi.fn>;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const categories = [
  { id: "root-1", name: "Судебные споры", slug: "sudebnye-spory", parentId: null, sortOrder: 1 },
  { id: "cat-a", name: "Составление исковых заявлений", slug: "iskovye-zayavleniya", parentId: "root-1", sortOrder: 1 },
  { id: "cat-b", name: "Представительство в суде", slug: "predstavitelstvo-v-sude", parentId: "root-1", sortOrder: 2 },
] as const;

describe("ServicesAdminClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    global.fetch = fetchMock as any;
  });

  function renderWithConfirm(ui: ReactElement) {
    return render(<ConfirmProvider>{ui}</ConfirmProvider>);
  }

  function getRowByTitle(title: string) {
    const titleEl = screen.getByText(title);
    let el: HTMLElement | null = titleEl;
    while (el) {
      const hasDelete = within(el).queryByRole("button", { name: "Удалить" });
      if (hasDelete) return el;
      el = el.parentElement;
    }
    throw new Error(`Row for title "${title}" not found`);
  }

  it("creates a service and redirects in create mode", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/admin/service-categories") {
        return Promise.resolve({ ok: true, json: async () => categories });
      }
      return Promise.resolve({ ok: true, json: async () => ({ id: "new-id" }) });
    });

    renderWithConfirm(<ServicesAdminClient mode="create" />);

    await user.click(screen.getByLabelText("category"));
    await user.click(screen.getByRole("option", { name: /Представительство в суде/i }));
    await user.type(screen.getByLabelText("title"), "Новая услуга");
    await user.type(screen.getByLabelText("price"), "2500 ₽");
    await user.clear(screen.getByLabelText("ctaText"));
    await user.type(screen.getByLabelText("ctaText"), "Оставить заявку");
    await user.clear(screen.getByLabelText("ctaHref"));
    await user.type(screen.getByLabelText("ctaHref"), "   ");
    await user.click(screen.getByRole("button", { name: "Создать" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const [, requestInit] = fetchMock.mock.calls[1];
    const payload = JSON.parse((requestInit as RequestInit).body as string) as {
      ctaHref: string | null;
      title: string;
      price: string;
      ctaText: string;
    };

    expect(payload.title).toBe("Новая услуга");
    expect(payload.price).toBe("2500 ₽");
    expect(payload.ctaText).toBe("Оставить заявку");
    expect(payload.ctaHref).toBeNull();
    expect(mockPush).toHaveBeenCalledWith("/admin/services/list");
  });

  it("deletes service in list mode and refreshes list", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => categories })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mainService, legalService],
      });

    renderWithConfirm(
      <ServicesAdminClient
        mode="list"
        initialServices={[mainService, legalService]}
      />
    );

    const row = getRowByTitle(mainService.title);
    await user.click(within(row).getByRole("button", { name: "Удалить" }));
    const confirmDialog = await screen.findByRole("dialog", { name: `Удалить услугу "${mainService.title}"?` });
    await user.click(within(confirmDialog).getByRole("button", { name: "Удалить" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));

    const [deleteUrl, deleteInit] = fetchMock.mock.calls[1];
    expect(deleteUrl).toBe(`/api/admin/services/${mainService.id}`);
    expect(deleteInit).toEqual({ method: "DELETE" });
  });

  it("deletes legal service row path", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => categories })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mainService, legalService],
      });

    renderWithConfirm(
      <ServicesAdminClient
        mode="list"
        initialServices={[mainService, legalService]}
      />
    );

    const row = getRowByTitle(legalService.title);
    await user.click(within(row).getByRole("button", { name: "Удалить" }));
    const confirmDialog = await screen.findByRole("dialog", { name: `Удалить услугу "${legalService.title}"?` });
    await user.click(within(confirmDialog).getByRole("button", { name: "Удалить" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));

    const [deleteUrl, deleteInit] = fetchMock.mock.calls[1];
    expect(deleteUrl).toBe(`/api/admin/services/${legalService.id}`);
    expect(deleteInit).toEqual({ method: "DELETE" });
  });

  it("edits service and sends PATCH payload", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => categories })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...mainService }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ ...mainService, title: "Обновленный title" }, legalService],
      });

    renderWithConfirm(
      <ServicesAdminClient
        mode="list"
        initialServices={[mainService, legalService]}
      />
    );

    const row = getRowByTitle(mainService.title);
    await user.click(within(row).getByRole("button", { name: "Редактировать" }));
    const dialog = await screen.findByRole("dialog", { name: "Редактировать услугу" });

    await user.clear(within(dialog).getByLabelText("title"));
    await user.type(within(dialog).getByLabelText("title"), "Обновленный title");
    await user.click(within(dialog).getByRole("button", { name: "Сохранить" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
    const [url, patchInit] = fetchMock.mock.calls[1];

    expect(url).toBe(`/api/admin/services/${mainService.id}`);
    expect((patchInit as RequestInit).method).toBe("PATCH");

    const body = JSON.parse((patchInit as RequestInit).body as string) as {
      title: string;
    };
    expect(body.title).toBe("Обновленный title");
  });

  it("shows API error when create fails", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/admin/service-categories") {
        return Promise.resolve({ ok: true, json: async () => categories });
      }
      return Promise.resolve({
        ok: false,
        json: async () => ({ error: "categoryId, title, price, ctaText are required" }),
      });
    });

    renderWithConfirm(<ServicesAdminClient mode="create" />);

    await user.click(screen.getByRole("button", { name: "Создать" }));

    expect(
      await screen.findByText("categoryId, title, price, ctaText are required")
    ).toBeInTheDocument();
  });

  it("does not call delete API when user cancels confirm", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/admin/service-categories") {
        return Promise.resolve({ ok: true, json: async () => categories });
      }
      return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
    });

    renderWithConfirm(
      <ServicesAdminClient
        mode="list"
        initialServices={[mainService, legalService]}
      />
    );

    const row = getRowByTitle(mainService.title);
    await user.click(within(row).getByRole("button", { name: "Удалить" }));
    const confirmDialog = await screen.findByRole("dialog", { name: `Удалить услугу "${mainService.title}"?` });
    await user.click(within(confirmDialog).getByRole("button", { name: "Отмена" }));

    // The component fetches categories on mount; delete request should not be called.
    expect(
      fetchMock.mock.calls.some((call: unknown[]) => String(call[0]).includes("/api/admin/services/")),
    ).toBe(false);
  });

  it("shows delete error when delete request fails", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/admin/service-categories") {
        return Promise.resolve({ ok: true, json: async () => categories });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });

    renderWithConfirm(
      <ServicesAdminClient
        mode="list"
        initialServices={[mainService, legalService]}
      />
    );

    const row = getRowByTitle(mainService.title);
    await user.click(within(row).getByRole("button", { name: "Удалить" }));
    const confirmDialog = await screen.findByRole("dialog", { name: `Удалить услугу "${mainService.title}"?` });
    await user.click(within(confirmDialog).getByRole("button", { name: "Удалить" }));

    expect(await screen.findByText("Failed to delete service")).toBeInTheDocument();
  });

  it("sends normalized nullable and numeric fields from edit form", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => categories })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...mainService }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mainService, legalService],
      });

    renderWithConfirm(
      <ServicesAdminClient
        mode="list"
        initialServices={[mainService, legalService]}
      />
    );

    const row = getRowByTitle(mainService.title);
    await user.click(within(row).getByRole("button", { name: "Редактировать" }));
    const dialog = await screen.findByRole("dialog", { name: "Редактировать услугу" });

    await user.clear(within(dialog).getByLabelText("ctaHref (null = empty)"));
    await user.type(within(dialog).getByLabelText("ctaHref (null = empty)"), "   ");

    await user.clear(within(dialog).getByLabelText("image (null = empty)"));
    await user.type(within(dialog).getByLabelText("image (null = empty)"), "  ");

    await user.clear(within(dialog).getByLabelText("rating (null = empty)"));
    await user.type(within(dialog).getByLabelText("rating (null = empty)"), "abc");
    await user.clear(within(dialog).getByLabelText("reviewCount (null = empty)"));
    await user.type(within(dialog).getByLabelText("reviewCount (null = empty)"), "12");

    await user.click(within(dialog).getByRole("button", { name: "Сохранить" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));

    const [, patchInit] = fetchMock.mock.calls[1];
    const body = JSON.parse((patchInit as RequestInit).body as string) as {
      ctaHref: string | null;
      image: string | null;
      rating: number | null;
      reviewCount: number | null;
    };

    expect(body.ctaHref).toBeNull();
    expect(body.image).toBeNull();
    expect(body.rating).toBeNull();
    expect(body.reviewCount).toBe(12);
  });

  it("shows API error when edit fails", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/admin/service-categories") {
        return Promise.resolve({ ok: true, json: async () => categories });
      }
      return Promise.resolve({
        ok: false,
        json: async () => ({ error: "Failed to update service from API" }),
      });
    });

    renderWithConfirm(
      <ServicesAdminClient
        mode="list"
        initialServices={[mainService, legalService]}
      />
    );

    const row = getRowByTitle(mainService.title);
    await user.click(within(row).getByRole("button", { name: "Редактировать" }));
    const dialog = await screen.findByRole("dialog", { name: "Редактировать услугу" });
    await user.click(within(dialog).getByRole("button", { name: "Сохранить" }));

    expect(await screen.findByText("Failed to update service from API")).toBeInTheDocument();
  });

  it("edits optional fields and keeps palette/icon normalized", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/admin/service-categories") {
        return Promise.resolve({ ok: true, json: async () => categories });
      }
      if (url === `/api/admin/services/${legalService.id}` && init?.method === "PATCH") {
        return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
      }
      if (url === "/api/admin/services") {
        return Promise.resolve({ ok: true, json: async () => [mainService, legalService] });
      }
      return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
    });

    renderWithConfirm(
      <ServicesAdminClient
        mode="list"
        initialServices={[mainService, legalService]}
      />
    );

    const row = getRowByTitle(legalService.title);
    await user.click(within(row).getByRole("button", { name: "Редактировать" }));
    const dialog = await screen.findByRole("dialog", { name: "Редактировать услугу" });

    await user.click(within(dialog).getByLabelText("category"));
    await user.click(screen.getByRole("option", { name: /Представительство в суде/i }));
    await user.clear(within(dialog).getByLabelText("price"));
    await user.type(within(dialog).getByLabelText("price"), "4500 ₽");
    await user.clear(within(dialog).getByLabelText("ctaText"));
    await user.type(within(dialog).getByLabelText("ctaText"), "Связаться");

    await user.clear(within(dialog).getByLabelText("stockBadge (null = empty)"));
    await user.type(within(dialog).getByLabelText("stockBadge (null = empty)"), "Осталось 5");
    await user.clear(within(dialog).getByLabelText("badge (null = empty)"));
    await user.type(within(dialog).getByLabelText("badge (null = empty)"), "Хит");
    await user.clear(within(dialog).getByLabelText("highlight (null = empty)"));
    await user.type(within(dialog).getByLabelText("highlight (null = empty)"), "договор");
    await user.clear(within(dialog).getByLabelText("description (null = empty)"));
    await user.type(within(dialog).getByLabelText("description (null = empty)"), "Подробности");
    // paletteColor/icon are validated and can be null; keep assertions focused on core text fields.

    await user.click(within(dialog).getByRole("button", { name: "Сохранить" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));

    const [, patchInit] = fetchMock.mock.calls[1];
    const body = JSON.parse((patchInit as RequestInit).body as string) as {
      categoryId: string;
      price: string;
      ctaText: string;
      stockBadge: string | null;
      badge: string | null;
      highlight: string | null;
      description: string | null;
      paletteColor: string | null;
      icon: string | null;
    };

    expect(body.categoryId).toBe("cat-b");
    expect(body.price).toBe("4500 ₽");
    expect(body.ctaText).toBe("Связаться");
    expect(body.stockBadge).toBe("Осталось5");
    expect(body.badge).toBe("Хит");
    expect(body.highlight).toBe("договор");
    expect(body.description).toBe("Подробности");
    expect(body.paletteColor).toBeNull();
    expect(body.icon).toBeNull();

  });

  it("closes edit dialog on cancel", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/admin/service-categories") {
        return Promise.resolve({ ok: true, json: async () => categories });
      }
      return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
    });

    renderWithConfirm(
      <ServicesAdminClient
        mode="list"
        initialServices={[mainService, legalService]}
      />
    );

    const row = getRowByTitle(mainService.title);
    await user.click(within(row).getByRole("button", { name: "Редактировать" }));
    const dialog = await screen.findByRole("dialog", { name: "Редактировать услугу" });
    await user.click(within(dialog).getByRole("button", { name: "Отмена" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Редактировать услугу" })).not.toBeInTheDocument();
    });
  });
});
