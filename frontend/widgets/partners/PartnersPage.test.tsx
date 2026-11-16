import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PartnersWorkspace } from "./PartnersPage";
import type { Partnership } from "./partner-types";

const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/features/select-city/ui/LocationField", () => ({
  LocationField: ({ onChange }: { onChange: (value: unknown) => void }) => (
    <button
      type="button"
      onClick={() => onChange({ id: "city", name: "Екатеринбург" })}
    >
      Все города
    </button>
  ),
}));
const profile = {
  id: "provider",
  name: "Кадастровое бюро",
  slug: "bureau",
  image: null,
  subtitle: null,
  city: {
    id: "city",
    name: "Екатеринбург",
    regionName: "Свердловская область",
  },
  services: [
    {
      id: "service",
      title: "Межевание участка",
      category: { name: "Кадастр" },
    },
  ],
};
let mine: Partnership[];
let fetchMock: ReturnType<typeof vi.fn>;
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });
beforeEach(() => {
  vi.clearAllMocks();
  mine = [];
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/service-categories")
      return json([
        { id: "parent", name: "Земля", parentId: null },
        { id: "child", name: "Кадастр", parentId: "parent" },
      ]);
    if (url === "/api/pro/partners" && init?.method !== "POST")
      return json({ items: mine });
    if (url.startsWith("/api/pro/partners/directory"))
      return json({ items: [profile], page: 1, hasMore: false });
    if (url.endsWith("/respond")) {
      mine = mine.map((item) =>
        item.id === "incoming" ? { ...item, status: "ACTIVE" } : item,
      );
      return json({ status: "ACTIVE" });
    }
    if (url.endsWith("/conversation"))
      return json({ conversationId: "conversation" });
    return json({ delivery: "EMAIL" });
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const directoryQueries = () =>
  fetchMock.mock.calls
    .filter(([url]) => String(url).includes("/partners/directory"))
    .map(([url]) => new URL(String(url), "http://localhost").searchParams);

it("keeps the directory empty until submit and combines the current filters only on search", async () => {
  render(<PartnersWorkspace />);
  await screen.findByText("Пока нет партнёров");
  expect(directoryQueries()).toHaveLength(0);
  expect(screen.queryByText("Кадастровое бюро")).toBeNull();
  const search = screen.getByRole("textbox", {
    name: "Поиск по названию услуги",
  });
  fireEvent.change(search, { target: { value: "ме" } });
  expect(screen.getByRole("button", { name: "Поиск" })).toBeDisabled();
  fireEvent.submit(search.closest("form")!);
  expect(directoryQueries()).toHaveLength(0);
  fireEvent.change(search, { target: { value: "меж" } });
  fireEvent.click(screen.getByRole("button", { name: "Все города" }));
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Категория" }));
  fireEvent.click(screen.getByRole("option", { name: "Земля" }));
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Подкатегория" }));
  fireEvent.click(screen.getByRole("option", { name: "Кадастр" }));
  fireEvent.change(
    screen.getByRole("textbox", {
      name: "Фамилия или наименование организации",
    }),
    { target: { value: "  Бюро  " } },
  );
  expect(directoryQueries()).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Поиск" }));
  await screen.findByText("Кадастровое бюро");
  await waitFor(() => {
    const query = directoryQueries().at(-1)!;
    expect(Object.fromEntries(query)).toMatchObject({
      cityId: "city",
      categoryId: "parent",
      subcategoryId: "child",
      search: "меж",
      providerSearch: "Бюро",
    });
  });
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Категория" }));
  fireEvent.click(screen.getByRole("option", { name: "Все категории" }));
  expect(
    screen.getByRole("combobox", { name: "Подкатегория" }),
  ).toHaveAttribute("aria-disabled", "true");
  expect(directoryQueries()).toHaveLength(1);
  fireEvent.submit(search.closest("form")!);
  await waitFor(() => expect(directoryQueries()).toHaveLength(2));
  expect(directoryQueries().at(-1)!.has("subcategoryId")).toBe(false);
  expect(screen.queryByText(/Найдено исполнителей/)).toBeNull();
});

it("requires three provider characters, supports independent search and resets both fields", async () => {
  render(<PartnersWorkspace />);
  await screen.findByText("Пока нет партнёров");
  const providerSearch = screen.getByRole("textbox", {
    name: "Фамилия или наименование организации",
  });
  const search = screen.getByRole("textbox", {
    name: "Поиск по названию услуги",
  });
  const latestQuery = () => directoryQueries().at(-1)!;
  for (const value of ["  Б  ", "  Бю  "]) {
    fireEvent.change(providerSearch, { target: { value } });
    fireEvent.submit(search.closest("form")!);
    expect(directoryQueries()).toHaveLength(0);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Введите минимум 3 символа для поиска по фамилии или наименованию организации.",
    );
  }
  fireEvent.change(providerSearch, { target: { value: "  Бюр  " } });
  expect(directoryQueries()).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Поиск" }));
  await screen.findByText("Кадастровое бюро");
  await waitFor(() => {
    expect(latestQuery().get("providerSearch")).toBe("Бюр");
    expect(latestQuery().has("search")).toBe(false);
  });
  fireEvent.change(search, { target: { value: "меж" } });
  expect(latestQuery().has("search")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Поиск" }));
  await waitFor(() =>
    expect(Object.fromEntries(latestQuery())).toMatchObject({
      search: "меж",
      providerSearch: "Бюр",
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Сбросить" }));
  expect(search).toHaveValue("");
  expect(providerSearch).toHaveValue("");
  expect(directoryQueries()).toHaveLength(2);
  expect(screen.queryByText("Кадастровое бюро")).toBeNull();
});

const pagedProfiles = Array.from({ length: 21 }, (_, index) => ({
  ...profile,
  id: `provider-${index + 1}`,
  slug: `bureau-${index + 1}`,
  name: `Бюро ${index + 1}`,
}));

function directoryMock(
  handler: (query: URLSearchParams) => Promise<Response> | Response,
) {
  const original = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation((url: string, init?: RequestInit) =>
    url.includes("/partners/directory")
      ? handler(new URL(url, "http://localhost").searchParams)
      : original(url, init),
  );
}

it("appends ten at a time, keeps loaded rows while loading and hides More after the last result", async () => {
  let resolveSecond!: (response: Response) => void;
  directoryMock((query) => {
    const page = Number(query.get("page"));
    if (page === 2)
      return new Promise<Response>((resolve) => {
        resolveSecond = resolve;
      });
    return json({
      items: pagedProfiles.slice((page - 1) * 10, page * 10),
      page,
      hasMore: page < 3,
    });
  });
  render(<PartnersWorkspace />);
  await screen.findByText("Пока нет партнёров");
  const catalog = screen.getByRole("region", { name: "Найти исполнителя" });
  fireEvent.click(screen.getByRole("button", { name: "Поиск" }));
  await within(catalog).findByRole("link", { name: "Бюро 10" });
  expect(within(catalog).getAllByRole("link")).toHaveLength(10);
  const more = within(catalog).getByRole("button", {
    name: "Ещё",
  });
  fireEvent.click(more);
  fireEvent.click(more);
  expect(more).toBeDisabled();
  expect(directoryQueries()).toHaveLength(2);
  expect(within(catalog).getAllByRole("link")).toHaveLength(10);
  await act(async () =>
    resolveSecond(
      json({ items: pagedProfiles.slice(10, 20), page: 2, hasMore: true }),
    ),
  );
  await within(catalog).findByRole("link", { name: "Бюро 20" });
  expect(within(catalog).getAllByRole("link")).toHaveLength(20);
  fireEvent.click(within(catalog).getByRole("button", { name: "Ещё" }));
  await within(catalog).findByRole("link", { name: "Бюро 21" });
  expect(within(catalog).getAllByRole("link")).toHaveLength(21);
  expect(within(catalog).queryByRole("button", { name: "Ещё" })).toBeNull();
  expect(screen.queryByText(/Найдено исполнителей/)).toBeNull();
});

it("preserves rows after a loading failure and retries the same next page", async () => {
  let failed = false;
  directoryMock((query) => {
    const page = Number(query.get("page"));
    if (page === 2 && !failed) {
      failed = true;
      return json({ message: "Не удалось загрузить исполнителей" }, 503);
    }
    return json({
      items: pagedProfiles.slice((page - 1) * 10, page * 10),
      page,
      hasMore: page === 1,
    });
  });
  render(<PartnersWorkspace />);
  await screen.findByText("Пока нет партнёров");
  const catalog = screen.getByRole("region", { name: "Найти исполнителя" });
  fireEvent.click(screen.getByRole("button", { name: "Поиск" }));
  fireEvent.click(await within(catalog).findByRole("button", { name: "Ещё" }));
  await within(catalog).findByText("Не удалось загрузить исполнителей");
  expect(within(catalog).getAllByRole("link")).toHaveLength(10);
  fireEvent.click(within(catalog).getByRole("button", { name: "Ещё" }));
  await within(catalog).findByRole("link", { name: "Бюро 20" });
  expect(directoryQueries().map((query) => query.get("page"))).toEqual([
    "1",
    "2",
    "2",
  ]);
  expect(within(catalog).queryByRole("button", { name: "Ещё" })).toBeNull();
});

it("uses submitted filters for More and ignores an old page after a new search", async () => {
  let resolveOld!: (response: Response) => void;
  directoryMock((query) => {
    if (query.get("providerSearch") === "Новое")
      return json({ items: [profile], page: 1, hasMore: false });
    if (query.get("page") === "2")
      return new Promise<Response>((resolve) => {
        resolveOld = resolve;
      });
    return json({ items: pagedProfiles.slice(0, 10), page: 1, hasMore: true });
  });
  render(<PartnersWorkspace />);
  await screen.findByText("Пока нет партнёров");
  const catalog = screen.getByRole("region", { name: "Найти исполнителя" });
  fireEvent.click(screen.getByRole("button", { name: "Поиск" }));
  await within(catalog).findByRole("link", { name: "Бюро 10" });
  fireEvent.change(
    screen.getByRole("textbox", {
      name: "Фамилия или наименование организации",
    }),
    { target: { value: "Новое" } },
  );
  expect(directoryQueries()).toHaveLength(1);
  fireEvent.click(within(catalog).getByRole("button", { name: "Ещё" }));
  expect(directoryQueries().at(-1)!.has("providerSearch")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Поиск" }));
  await within(catalog).findByRole("link", {
    name: "Кадастровое бюро",
  });
  await act(async () =>
    resolveOld(
      json({ items: pagedProfiles.slice(10, 20), page: 2, hasMore: true }),
    ),
  );
  expect(within(catalog).getAllByRole("link")).toHaveLength(1);
  expect(within(catalog).queryByRole("button", { name: "Ещё" })).toBeNull();
  expect(directoryQueries().at(-1)!.get("page")).toBe("1");
});

it("shows pending email invitations and requires incoming confirmation before chat", async () => {
  mine = [
    {
      id: "pending",
      provider: null,
      status: "PENDING",
      incoming: false,
      email: "new@example.test",
      sentAt: new Date().toISOString(),
      expiresAt: null,
    },
    {
      id: "incoming",
      provider: profile,
      status: "PENDING",
      incoming: true,
      email: null,
      sentAt: null,
      expiresAt: null,
    },
  ];
  render(<PartnersWorkspace />);
  const section = screen.getByRole("region", { name: "Мои партнёры" });
  await within(section).findByText("Приглашение отправлено");
  expect(
    within(section).queryByRole("button", { name: "Написать" }),
  ).toBeNull();
  fireEvent.click(within(section).getByRole("button", { name: "Принять" }));
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pro/partners/incoming/respond",
      expect.objectContaining({ body: JSON.stringify({ action: "accept" }) }),
    ),
  );
  fireEvent.click(
    await within(section).findByRole("button", { name: "Написать" }),
  );
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith("/pro/chats/direct/conversation"),
  );
});

it("cancelling email invitation sends nothing; delivery failure remains visible in the dialog", async () => {
  render(<PartnersWorkspace />);
  await screen.findByText("Пока нет партнёров");
  fireEvent.click(screen.getByRole("button", { name: "Добавить по почте" }));
  fireEvent.change(
    screen.getByRole("textbox", { name: "Электронная почта исполнителя" }),
    { target: { value: "new@example.test" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(
    fetchMock.mock.calls.filter(([, init]) => init?.method === "POST"),
  ).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Добавить по почте" }));
  fetchMock.mockImplementationOnce(async () =>
    json({ message: "Не удалось отправить письмо" }, 502),
  );
  fireEvent.click(screen.getByRole("button", { name: "Пригласить" }));
  const dialog = screen.getByRole("dialog");
  await within(dialog).findByText("Не удалось отправить письмо");
  expect(screen.queryByText("Письмо с приглашением отправлено.")).toBeNull();
});
