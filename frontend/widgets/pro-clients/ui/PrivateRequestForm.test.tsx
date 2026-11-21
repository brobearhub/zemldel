import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
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

it("creates a freeform request for an unregistered contact and navigates to the result", async () => {
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
  await user.click(submit);
  expect(writeClientData).toHaveBeenCalledWith(
    "/api/pro/clients/contact/requests",
    "POST",
    { message: "Уточнить границы" },
    true,
  );
  expect(router.push).toHaveBeenCalledWith("/pro/requests/created-request");
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
