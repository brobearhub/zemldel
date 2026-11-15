import { render, screen } from "@testing-library/react";
import { makeAuthSession } from "@/tests/fixtures/auth-session";
import { getServerAuthSession } from "@/core/auth";
import { BackendApiError, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import UsersPage from "./page";
import UserPage from "./[id]/page";
import type { PassportAuditPage } from "./model";

vi.mock("@/core/auth", () => ({ getServerAuthSession: vi.fn() }));
vi.mock("next/navigation", () => ({
  forbidden: () => { throw new Error("NEXT_FORBIDDEN"); },
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
}));
vi.mock("@/shared/api/backend/server", () => ({
  fetchBackendJsonAsUser: vi.fn(),
  BackendApiError: class extends Error {
    constructor(message: string, readonly status: number, readonly body: unknown) {
      super(message);
    }
  },
}));

const fetchBackend = vi.mocked(fetchBackendJsonAsUser);
const getSession = vi.mocked(getServerAuthSession);
const user = {
  id: "customer-1",
  name: "Заказчик",
  email: "customer@example.com",
  accountKind: "CUSTOMER" as const,
  createdAt: "2026-11-15T10:00:00Z",
};
const userProps = {
  params: Promise.resolve({ id: user.id }),
  searchParams: Promise.resolve({}),
};

beforeEach(() => {
  vi.resetAllMocks();
  getSession.mockResolvedValue(makeAuthSession({ systemRole: "PLATFORM_ADMIN" }));
});

it.each(["anonymous", "customer", "provider"])("denies the %s access before requesting any user data", async (role) => {
  getSession.mockResolvedValue(role === "anonymous" ? null : makeAuthSession({
    systemRole: "CUSTOMER",
    accountKind: role === "provider" ? "PROVIDER" : "CUSTOMER",
  }));
  await expect(UsersPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_FORBIDDEN");
  await expect(UserPage(userProps)).rejects.toThrow("NEXT_FORBIDDEN");
  expect(fetchBackend).not.toHaveBeenCalled();
});

it("searches users, opens the selected journal and preserves the filter in pagination", async () => {
  fetchBackend.mockResolvedValue({ items: [user], total: 120, page: 2, pageSize: 50 });
  render(await UsersPage({ searchParams: Promise.resolve({ q: "Заказчик", page: "2" }) }));
  expect(fetchBackend).toHaveBeenCalledWith(`/admin/users?${new URLSearchParams({ q: "Заказчик", page: "2" })}`, "user-1");
  expect(screen.getByRole("link", { name: /Заказчик.*Журнал доступа/ })).toHaveAttribute("href", "/admin/users/customer-1");
  expect(screen.getByRole("link", { name: "Далее" })).toHaveAttribute("href", `/admin/users?${new URLSearchParams({ q: "Заказчик", page: "3" })}`);
});

it("shows passport events with the responsible user, provider and request and keeps older events reachable", async () => {
  const history: PassportAuditPage = {
    user,
    total: 51,
    page: 1,
    pageSize: 50,
    items: [{
      id: "event-1",
      action: "PROVIDER_PHOTO_READ",
      actorUserId: "provider-user-1",
      actorProviderId: "provider-1",
      requestId: "request-1",
      createdAt: "2026-11-15T10:00:01Z",
      actorName: "Сотрудник исполнителя",
      providerName: "ООО Исполнитель",
      requestNumber: 21,
      requestTitle: "Межевание",
    }],
  };
  fetchBackend.mockResolvedValue(history);
  render(await UserPage(userProps));
  expect(fetchBackend).toHaveBeenCalledWith("/admin/users/customer-1/passport-audit", "user-1");
  expect(screen.getByText("Исполнителю выдан файл фотографии паспорта")).toBeInTheDocument();
  expect(screen.getByText("Участник: Сотрудник исполнителя")).toBeInTheDocument();
  expect(screen.getByText("Исполнитель: ООО Исполнитель")).toBeInTheDocument();
  expect(screen.getByText("Заявка № 21 · Межевание")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Далее" })).toHaveAttribute("href", "/admin/users/customer-1?page=2");
});

it.each([401, 403, 404])("handles backend %i without displaying user history", async (status) => {
  fetchBackend.mockRejectedValue(new BackendApiError("Denied", status, null));
  await expect(UserPage(userProps)).rejects.toThrow(status === 404 ? "NEXT_NOT_FOUND" : "NEXT_FORBIDDEN");
});
