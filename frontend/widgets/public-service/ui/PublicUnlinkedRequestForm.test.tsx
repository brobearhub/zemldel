import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicUnlinkedRequestForm } from "./PublicUnlinkedRequestForm";
import { readPendingRequestDraft } from "@/entities/request";

const push = vi.fn();
const auth = vi.hoisted(() => ({ accountKind: "CUSTOMER" }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { id: "test-customer", accountKind: auth.accountKind } } }) }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/features/select-city", () => ({
  useSelectedCity: () => ({
    id: "city-1",
    name: "Москва", regionCode: "77", regionName: "Москва", displayName: "Москва",
  }),
  LocationField: () => <div>location-field</div>,
}));

vi.mock("@/shared/ui/CadastralNumberChipsField", () => ({
  CadastralNumberChipsField: () => <div>cadastral-field</div>,
}));

vi.mock("@/widgets/public-service/ui/RequestFormLogo", () => ({
  RequestFormLogo: () => <div>logo</div>,
}));

describe("PublicUnlinkedRequestForm", () => {
  beforeEach(() => { vi.clearAllMocks(); window.sessionStorage.clear(); auth.accountKind = "CUSTOMER"; });
  afterEach(() => vi.unstubAllGlobals());
  it("объясняет сценарий выбора среди нескольких исполнителей", () => {
    render(<PublicUnlinkedRequestForm isAuthenticated variant="card" />);

    expect(
      screen.getByText("Заявку увидят несколько подходящих исполнителей. Сравните ответы в чатах и выберите одного.")
    ).toBeInTheDocument();
  });

  it("блокирует ввод и отправку свободной заявки для исполнителя с понятным сообщением", () => {
    auth.accountKind = "PROVIDER";
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    render(<PublicUnlinkedRequestForm isAuthenticated />);
    const message = screen.getByLabelText(/Что нужно сделать/);
    expect(message).toBeDisabled();
    expect(screen.getByRole("button", { name: "Создать заявку" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Исполнитель не может отправить свободную заявку. Создать её можно из аккаунта клиента.");
    fireEvent.submit(message.closest("form")!);
    expect(fetcher).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByText("Forbidden")).not.toBeInTheDocument();
  });

  it("opens the created FREEFORM request instead of the general list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({id: "new-request"}), {status:201})));
    render(<PublicUnlinkedRequestForm isAuthenticated />);
    fireEvent.change(screen.getByLabelText(/Что нужно сделать/), { target: { value: "Оформить документы на участок" } });
    fireEvent.click(screen.getByRole("button", { name: "Создать заявку" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/profile/requests/new-request?created=1"));
  });

  it("saves the task and work city if an authenticated session expires", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: "Unauthorized" }) }));
    render(<PublicUnlinkedRequestForm isAuthenticated />);
    fireEvent.change(screen.getByLabelText(/Что нужно сделать/), { target: { value: "Оформить документы на участок" } });
    fireEvent.click(screen.getByRole("button", { name: "Создать заявку" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining("/signin?intent=service-request&account=customer")));
    expect(readPendingRequestDraft()).toMatchObject({ message: "Оформить документы на участок", requestCityId: "city-1", requestCity: { name: "Москва" } });
  });
});
