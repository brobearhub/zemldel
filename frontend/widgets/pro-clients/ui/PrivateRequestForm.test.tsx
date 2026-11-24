import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { writeClientData } from "@/entities/provider-client/api";
import type { ProviderClient } from "@/entities/provider-client/model";
import { PrivateRequestForm } from "./PrivateRequestForm";

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/entities/provider-client/api", () => ({ writeClientData: vi.fn() }));

const contact: ProviderClient = {
  id: "contact",
  email: "new@example.test",
  name: null,
  customerUserId: null,
  status: "CONTACT",
  source: "MANUAL",
  createdAt: "2026-11-21T00:00:00Z",
  ordersCount: 0,
  lastOrderAt: null,
  recentServiceTitles: [],
  statuses: {},
};
const service = { id: "survey", title: "Межевание" };
const city = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Екатеринбург",
  regionCode: "66",
  regionName: "Свердловская область",
  displayName: "Екатеринбург, Свердловская область",
};

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
    new Response(JSON.stringify([city])),
  );
});

afterEach(() => vi.restoreAllMocks());

it("keeps the add action last during search and preserves the selected client on cancel", async () => {
  const anna = {
    ...contact,
    id: "anna",
    name: "Анна",
    email: "anna@example.test",
  };
  await act(async () => {
    render(<PrivateRequestForm clients={[contact, anna]} services={[]} />);
  });
  const input = screen.getByRole("combobox", { name: /Клиент/ });
  const optionLabels = () =>
    screen.getAllByRole("option").map((option) => option.textContent);
  act(() => input.focus());
  fireEvent.mouseDown(input);
  expect(optionLabels()).toEqual([
    contact.email,
    "Анна · anna@example.test",
    "+ Добавить клиента",
  ]);
  fireEvent.change(input, { target: { value: "Анна" } });
  expect(optionLabels()).toEqual([
    "Анна · anna@example.test",
    "+ Добавить клиента",
  ]);
  fireEvent.click(
    screen.getByRole("option", { name: "Анна · anna@example.test" }),
  );
  fireEvent.mouseDown(input);
  fireEvent.keyDown(input, { key: "End" });
  fireEvent.keyDown(input, { key: "Enter" });
  const dialog = await screen.findByRole("dialog", { name: "Добавить клиента" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Отмена" }));
  expect(input).toHaveValue("Анна · anna@example.test");
});

it.each([
  { scenario: "the list is empty", clients: [], query: "" },
  { scenario: "the search has no matches", clients: [contact], query: "Вера" },
])("opens the editor and selects the saved client when $scenario", async ({ clients, query }) => {
  const added = {
    ...contact,
    id: "added",
    name: "Вера",
    email: "vera@example.test",
  };
  vi.mocked(writeClientData).mockResolvedValueOnce(added);
  await act(async () => {
    render(<PrivateRequestForm clients={clients} services={[]} />);
  });
  const input = screen.getByRole("combobox", { name: /Клиент/ });
  act(() => input.focus());
  fireEvent.mouseDown(input);
  if (query) fireEvent.change(input, { target: { value: query } });
  const options = screen.getAllByRole("option");
  expect(options).toHaveLength(1);
  expect(options[0]).toHaveTextContent("+ Добавить клиента");
  fireEvent.click(options[0]);
  const dialog = within(
    await screen.findByRole("dialog", { name: "Добавить клиента" }),
  );
  fireEvent.change(dialog.getByRole("textbox", { name: /Email клиента/ }), {
    target: { value: added.email },
  });
  fireEvent.change(dialog.getByRole("textbox", { name: "Имя клиента" }), {
    target: { value: added.name },
  });
  await act(async () => {
    fireEvent.click(dialog.getByRole("button", { name: "Добавить" }));
  });
  expect(writeClientData).toHaveBeenLastCalledWith("/api/pro/clients", "POST", {
    email: added.email,
    name: added.name,
  });
  expect(input).toHaveValue("Вера · vera@example.test");
});

it("creates a freeform request with a selected city and a manually entered address", async () => {
  const user = userEvent.setup();
  vi.mocked(writeClientData).mockResolvedValueOnce({ id: "created-request" });
  render(
    <PrivateRequestForm
      clients={[contact]}
      initialClientId={contact.id}
      services={[]}
    />,
  );
  const submit = screen.getByRole("button", { name: "Создать заявку" });
  expect(submit).toBeDisabled();
  await user.type(
    screen.getByRole("textbox", { name: /Описание работ/ }),
    "Уточнить границы",
  );
  await user.type(
    screen.getByRole("textbox", { name: "Адрес места работ" }),
    "  ГСК Луч, бокс 7  ",
  );
  await user.type(screen.getByRole("combobox", { name: "Город" }), "Екат");
  await user.click(
    await screen.findByRole("option", { name: city.displayName }),
  );
  await user.click(submit);
  expect(writeClientData).toHaveBeenCalledWith(
    "/api/pro/clients/contact/requests",
    "POST",
    {
      message: "Уточнить границы",
      requestCityId: city.id,
      location: "ГСК Луч, бокс 7",
    },
    true,
  );
  expect(router.push).toHaveBeenCalledWith("/pro/requests/created-request");
});

it("keeps the manual address when the selected city is cleared", async () => {
  const user = userEvent.setup();
  vi.mocked(writeClientData).mockResolvedValueOnce({ id: "address-only" });
  render(
    <PrivateRequestForm
      clients={[contact]}
      initialClientId={contact.id}
      services={[]}
    />,
  );
  await user.type(screen.getByRole("textbox", { name: /Описание работ/ }), "Выезд");
  await user.type(
    screen.getByRole("textbox", { name: "Адрес места работ" }),
    "СНТ Лес, участок 5",
  );
  const cityInput = screen.getByRole("combobox", { name: "Город" });
  await user.click(cityInput);
  await user.click(
    await screen.findByRole("option", { name: city.displayName }),
  );
  await user.clear(cityInput);
  await user.click(screen.getByRole("button", { name: "Создать заявку" }));
  expect(writeClientData).toHaveBeenLastCalledWith(
    "/api/pro/clients/contact/requests",
    "POST",
    { message: "Выезд", location: "СНТ Лес, участок 5" },
    true,
  );
});

it("creates a request using the selected service for a connected customer", async () => {
  const user = userEvent.setup();
  vi.mocked(writeClientData).mockResolvedValueOnce({ id: "second" });
  render(
    <PrivateRequestForm
      clients={[
        { ...contact, status: "CONNECTED", customerUserId: "customer" },
      ]}
      initialClientId={contact.id}
      services={[service]}
    />,
  );
  await user.click(screen.getByRole("combobox", { name: /Тип заявки/ }));
  await user.click(screen.getByRole("option", { name: "По моей услуге" }));
  await user.click(screen.getByRole("combobox", { name: /Услуга/ }));
  await user.click(screen.getByRole("option", { name: "Межевание" }));
  await user.click(screen.getByRole("button", { name: "Создать заявку" }));
  expect(writeClientData).toHaveBeenLastCalledWith(
    "/api/pro/clients/contact/requests",
    "POST",
    { serviceId: "survey" },
    true,
  );
  expect(router.push).toHaveBeenCalledWith("/pro/requests/second");
});
