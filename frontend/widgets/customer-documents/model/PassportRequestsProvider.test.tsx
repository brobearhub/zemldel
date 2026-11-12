import { act, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { makeStore } from "@/core/store/store";
import { setAuthenticated, setUnauthenticated, type AuthUser } from "@/core/store/authSlice";
import { CustomerNotificationsButton } from "@/widgets/cabinet-chrome/ui/CustomerNotificationsButton";
import { PassportRequestsProvider } from "./PassportRequestsProvider";
import { refreshPassportRequests } from "./passport-access";

const user = {id:"customer-1",accountKind:"CUSTOMER",memberships:[]} as unknown as AuthUser;
const pending = () => Response.json({requests:[{requestId:"request-1",kind:"FORM"}]});
function setup(authUser: AuthUser = user) {
  const store = makeStore();
  store.dispatch(setAuthenticated(authUser));
  render(<Provider store={store}><PassportRequestsProvider><CustomerNotificationsButton /></PassportRequestsProvider></Provider>);
  return store;
}

afterEach(() => vi.unstubAllGlobals());

it("refreshes the animated dot from existing request events and clears it after resolution", async () => {
  let requested = false;
  vi.stubGlobal("fetch", vi.fn(async () => requested ? pending() : Response.json({requests:[]})));
  setup();
  await screen.findByRole("link", {name:"Документы и доступ к паспорту"});
  requested = true;
  act(() => window.dispatchEvent(new CustomEvent("request:changed", {detail:{requestId:"request-1"}})));
  const bell = await screen.findByRole("link", {name:"Запрошены документы паспорта"});
  expect(bell).toHaveAttribute("href", "/profile?section=documents#passport-access");
  expect(bell.querySelector(".MuiBadge-badge")).not.toHaveClass("MuiBadge-invisible");
  expect(bell.querySelector(".MuiBadge-badge")).toHaveTextContent("");
  requested = false;
  act(() => refreshPassportRequests());
  await screen.findByRole("link", {name:"Документы и доступ к паспорту"});
  expect(bell.querySelector(".MuiBadge-badge")).toHaveClass("MuiBadge-invisible");
});

it("keeps pending state on a failed refresh, and never leaks it across logout or account changes", async () => {
  let fail = false;
  const fetchMock = vi.fn(async () => fail ? Response.json({}, {status:502}) : pending());
  vi.stubGlobal("fetch", fetchMock);
  const store = setup();
  await screen.findByRole("link", {name:"Запрошены документы паспорта"});
  fail = true;
  act(() => refreshPassportRequests());
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(screen.getByRole("link", {name:"Запрошены документы паспорта"})).toBeInTheDocument();
  act(() => store.dispatch(setUnauthenticated()));
  expect(screen.getByRole("link", {name:"Документы и доступ к паспорту"})).toBeInTheDocument();
  act(() => store.dispatch(setAuthenticated({...user,id:"customer-2"})));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  expect(screen.queryByRole("link", {name:"Запрошены документы паспорта"})).not.toBeInTheDocument();
});

it("does not query customer requests for a provider account", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  setup({...user, accountKind:"PROVIDER"});
  expect(screen.getByRole("link", {name:"Документы и доступ к паспорту"})).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});
