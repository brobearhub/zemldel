import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { ConfirmProvider } from "@/shared/ui/confirm";
import { CustomerDocumentsSection } from "./CustomerDocumentsSection";

const passport = {
  series: "1234",
  number: "567890",
  fullName: "Тестовый Пользователь",
  birthDate: "1990-01-02",
  issuedAt: "2010-02-03",
  issuedBy: "Тестовое подразделение",
  departmentCode: "123-456",
  registrationAddress: "Тестовый адрес",
};
const request = {
  id: "request-1",
  serviceTitle: "Межевание участка",
  message: "",
  providerId: "provider-1",
  providerName: "Тестовый исполнитель",
  status: "ACTIVE",
};
const contract = {
  id: "contract-1",
  originalName: "Договор.pdf",
  sizeBytes: 1024,
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function setup(initialPassport: typeof passport | null = null) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (path === "/api/documents/passport") {
      return init?.method ? json({ ok: true }) : json(initialPassport);
    }
    if (path === "/api/documents/passport/access") return json({ hasForm: Boolean(initialPassport), photoCount: 0, grants: [], audit: [] });
    if (path.startsWith("/api/documents/passport/access/")) return json({ ok: true });
    if (path === "/api/documents/passport/photos") return json([]);
    if (path === "/api/requests") return json([request]);
    if (path === "/api/requests/with-documents") return json([request.id]);
    if (path.endsWith("/contract-files")) return json([contract]);
    if (path.endsWith("/contract-bundles")) return json([{ document: contract, signature: null }]);
    if (path.endsWith("/document-requests")) return json([{
      id: "document-1",
      title: "Выписка ЕГРН",
      originalName: "Выписка.pdf",
      status: "UPLOADED",
      sizeBytes: 2048,
    }]);
    if (path.endsWith("/work-stages")) return json([{
      id: "stage-1",
      title: "Подготовка плана",
      files: [{ id: "plan-1", originalName: "План.pdf", sizeBytes: 4096 }],
      docSlots: [{ id: "slot-1", title: "Схема участка", status: "REQUESTED", originalName: null, sizeBytes: null }],
    }]);
    throw new Error(`Unexpected request: ${path}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(
    <ThemeProvider theme={createAppTheme("light")}>
      <ConfirmProvider>
        <CustomerDocumentsSection />
      </ConfirmProvider>
    </ThemeProvider>,
  );
  return { user, fetchMock };
}

describe("CustomerDocumentsSection", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(() => "blob:passport-preview"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts collapsed and shows a saved summary only after a successful save", async () => {
    const { user, fetchMock } = setup();
    await screen.findByRole("button", { name: "Заполнить паспортные данные" });
    expect(screen.getAllByRole("heading", { name: "Документы" })).toHaveLength(1);
    expect(screen.queryByRole("textbox", { name: /Серия/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Заполнить паспортные данные" }));
    expect(screen.getByRole("dialog", { name: "Заполнить паспортные данные" })).toBeInTheDocument();
    expect(screen.getByText(/152-ФЗ/)).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: /Серия/ }), "1234");
    await user.type(screen.getByRole("textbox", { name: /Номер/ }), "567890");
    await user.type(screen.getByRole("textbox", { name: "ФИО" }), "Тестовый Пользователь");
    await user.click(screen.getByRole("button", { name: "Сохранить анкету" }));

    expect(await screen.findByText("Анкета сохранена")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("form", { name: "Паспортная анкета" })).not.toBeInTheDocument();
    expect(screen.getByText("Тестовый Пользователь")).toBeInTheDocument();
    expect(screen.getByText("Паспорт •••• ••••90")).toBeInTheDocument();
    const write = fetchMock.mock.calls.find(([, init]: [RequestInfo | URL, RequestInit?]) => init?.method === "PUT");
    expect(JSON.parse(String(write?.[1]?.body))).toMatchObject({ series: "1234", number: "567890" });
  });

  it("keeps the form and unsaved values on a failed save", async () => {
    const { user, fetchMock } = setup(passport);
    await user.click(await screen.findByRole("button", { name: "Редактировать" }));
    const name = screen.getByRole("textbox", { name: "ФИО" });
    await user.clear(name);
    await user.type(name, "Изменённое имя");
    fetchMock.mockResolvedValueOnce(json({ error: "Ошибка сохранения" }, 500));
    await user.click(screen.getByRole("button", { name: "Сохранить анкету" }));

    expect(await screen.findByText("Ошибка сохранения")).toBeInTheDocument();
    expect(name).toHaveValue("Изменённое имя");
    expect(screen.queryByText("Анкета сохранена")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Отмена" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText(passport.fullName)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Редактировать" }));
    expect(screen.getByRole("textbox", { name: "ФИО" })).toHaveValue(passport.fullName);
  });

  it("requires confirmation before deleting the saved form", async () => {
    const { user, fetchMock } = setup(passport);
    await screen.findByRole("button", { name: "Редактировать" });
    await user.click(screen.getByRole("button", { name: "Удалить" }));
    expect(fetchMock.mock.calls.some(([, init]: [RequestInfo | URL, RequestInit?]) => init?.method === "DELETE")).toBe(false);
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Удалить" }));
    expect(await screen.findByText("Анкета удалена")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Заполнить паспортные данные" })).toBeInTheDocument();
  });

  it("previews a selected photo before explicit upload", async () => {
    const { user, fetchMock } = setup();
    await screen.findByRole("button", { name: "Заполнить паспортные данные" });
    const file = new File(["test-image"], "example.png", { type: "image/png" });
    const before = fetchMock.mock.calls.length;
    await user.upload(screen.getByLabelText("Выбрать фото паспорта"), file);

    expect(await screen.findByAltText("Предпросмотр: example.png")).toHaveAttribute("src", "blob:passport-preview");
    expect(screen.getByText(/Не загружено/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Загрузить фото" })).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledTimes(before);
    await user.click(screen.getByRole("button", { name: "Убрать фото example.png" }));
    expect(screen.queryByAltText("Предпросмотр: example.png")).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:passport-preview");
  });

  it("can grant the saved form without granting absent photos", async () => {
    const { user, fetchMock } = setup(passport);
    await screen.findByRole("button", { name: "Редактировать" });
    await user.click(within(screen.getByRole("region", { name: "Данные паспорта" })).getByRole("button", { name: "Поделиться" }));
    const dialog = screen.getByRole("dialog", { name: "Поделиться паспортом" });
    await waitFor(() => expect(within(dialog).getByRole("checkbox", { name: "Данные анкеты" })).toBeChecked());
    expect(within(dialog).getByRole("checkbox", { name: /Фото паспорта/ })).toBeDisabled();
    await user.click(within(dialog).getByRole("combobox", { name: "Заявка и исполнитель" }));
    await user.click(screen.getByRole("option", { name: /Межевание участка/ }));
    await user.click(within(dialog).getByRole("button", { name: "Сохранить разрешения" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const write = fetchMock.mock.calls.find(([url, init]: [RequestInfo | URL, RequestInit?]) => String(url).includes("/access/") && init?.method === "PUT");
    expect(JSON.parse(String(write?.[1]?.body))).toEqual({ form: true, photo: false, durationDays: 7 });
  });

  it("loads documents on expansion, deduplicates contracts and links to the correct request", async () => {
    const { user, fetchMock } = setup();
    const group = await screen.findByRole("button", { name: /Межевание участка/ });
    expect(fetchMock.mock.calls.some(([url]: [RequestInfo | URL, RequestInit?]) => String(url).includes("/contract-files"))).toBe(false);
    await user.click(group);
    expect(await screen.findByRole("link", { name: "Скачать Договор.pdf" })).toHaveAttribute(
      "href", "/api/requests/request-1/contract-files/contract-1/download",
    );
    expect(screen.getAllByRole("link", { name: "Скачать Договор.pdf" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Скачать Выписка ЕГРН" })).toHaveAttribute(
      "href", "/api/requests/request-1/document-requests/document-1/download",
    );
    expect(screen.getByRole("link", { name: "Скачать План.pdf" })).toHaveAttribute(
      "href", "/api/requests/request-1/work-stages/stage-1/files/plan-1/download",
    );
    expect(screen.getByRole("link", { name: "Загрузить Схема участка в заявке" })).toHaveAttribute(
      "href", "/profile/requests/request-1#documents",
    );
    expect(screen.getByRole("link", { name: "Открыть заявку" })).toHaveAttribute("href", "/profile/requests/request-1");
  });

  it("shows partial document failures without hiding successfully loaded files", async () => {
    const { user, fetchMock } = setup();
    const group = await screen.findByRole("button", { name: /Межевание участка/ });
    fetchMock.mockResolvedValueOnce(json({ error: "Unavailable" }, 503));
    await user.click(group);
    expect(await screen.findByText("Не удалось загрузить: договоры.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Скачать Выписка ЕГРН" })).toBeInTheDocument();
    expect(screen.queryByText("В этой заявке пока нет документов.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Повторить" }));
    await waitFor(() => expect(screen.queryByText("Не удалось загрузить: договоры.")).not.toBeInTheDocument());
  });
});
