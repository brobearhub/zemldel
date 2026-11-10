import { act, cleanup, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { makeStore } from "@/core/store/store";
import {
  setAuthenticated,
  setUnauthenticated,
  type AuthUser,
} from "@/core/store/authSlice";
import {
  notifyRemindersChanged,
  requestReminderCount,
} from "@/entities/request/lib/reminder-events";
import { ReminderCountProvider } from "./ReminderCountProvider";
import { ProviderNotificationsButton } from "../ui/ProviderHeaderStatus";

const user: AuthUser = {
  id: "u1",
  name: "User",
  email: null,
  phone: null,
  image: null,
  accountKind: "PROVIDER",
  systemRole: "CUSTOMER",
  activeProviderId: "p1",
  customerCity: null,
  memberships: ["p1", "p2"].map((providerId) => ({
    providerId,
    providerName: providerId,
    providerSlug: providerId,
    providerType: "COMPANY",
    providerCity: null,
    role: "OWNER",
    status: "ACTIVE",
  })),
};
let desktopMode = true;
const viewportListeners = new Set<() => void>();
const response = (count: number) => new Response(JSON.stringify({ count }));
const settle = () => act(async () => {});

function setup(authUser: AuthUser | null = user) {
  const store = makeStore();
  store.dispatch(authUser ? setAuthenticated(authUser) : setUnauthenticated());
  const view = render(
    <Provider store={store}>
      <ReminderCountProvider>
        <ProviderNotificationsButton />
        <ProviderNotificationsButton label="Напоминания" />
      </ReminderCountProvider>
    </Provider>,
  );
  return { ...view, store };
}

beforeEach(() => {
  vi.useFakeTimers();
  desktopMode = true;
  viewportListeners.clear();
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    get matches() {
      return desktopMode;
    },
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((_, listener) => {
      viewportListeners.add(listener as () => void);
    }),
    removeEventListener: vi.fn((_, listener) => {
      viewportListeners.delete(listener as () => void);
    }),
    dispatchEvent: vi.fn(() => true),
  }));
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  vi.spyOn(globalThis, "fetch").mockResolvedValue(response(2));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("shares one poll across both icons and hides zero after the next refresh", async () => {
  setup();
  await settle();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(
    screen.getAllByRole("link", { name: /2 в ближайший час/ }),
  ).toHaveLength(2);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(14 * 60_000);
  });
  act(() => window.dispatchEvent(new Event("focus")));
  await settle();
  expect(fetch).toHaveBeenCalledTimes(1);
  vi.mocked(fetch).mockResolvedValueOnce(response(0));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60_000);
  });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(
    screen.getByRole("link", { name: "Открыть напоминания" }),
  ).toBeInTheDocument();
  for (const badge of screen.getAllByText("2")) {
    expect(badge).toHaveClass("MuiBadge-invisible");
  }
});

it("stops polling in a hidden tab and catches up on return and mutation", async () => {
  setup();
  await settle();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(20 * 60_000);
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  vi.mocked(fetch).mockResolvedValueOnce(response(3));
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  await settle();
  expect(
    screen.getAllByRole("link", { name: /3 в ближайший час/ }),
  ).toHaveLength(2);
  vi.mocked(fetch).mockResolvedValueOnce(response(1));
  act(() => notifyRemindersChanged());
  await settle();
  expect(
    screen.getAllByRole("link", { name: /1 в ближайший час/ }),
  ).toHaveLength(2);
});

it("clears the previous provider count and ignores its late response", async () => {
  let resolveOld!: (value: Response) => void;
  vi.mocked(fetch).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
  );
  const { store } = setup();
  vi.mocked(fetch).mockResolvedValueOnce(response(5));
  act(() =>
    store.dispatch(setAuthenticated({ ...user, activeProviderId: "p2" })),
  );
  await settle();
  await act(async () => {
    resolveOld(response(9));
  });
  expect(
    screen.getAllByRole("link", { name: /5 в ближайший час/ }),
  ).toHaveLength(2);
  expect(screen.queryByText("9")).not.toBeInTheDocument();
  act(() => store.dispatch(setUnauthenticated()));
  expect(
    screen.getByRole("link", { name: "Открыть напоминания" }),
  ).toBeInTheDocument();
});

it("does not request counts for a customer or guest", async () => {
  const { store } = setup({ ...user, accountKind: "CUSTOMER" });
  await settle();
  act(() => store.dispatch(setUnauthenticated()));
  await settle();
  expect(fetch).not.toHaveBeenCalled();
});

it("retries after an error and clears pending timers on unmount", async () => {
  vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
  const { unmount } = setup();
  await settle();
  vi.mocked(fetch).mockResolvedValueOnce(response(4));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15 * 60_000);
  });
  expect(
    screen.getAllByRole("link", { name: /4 в ближайший час/ }),
  ).toHaveLength(2);
  unmount();
  const calls = vi.mocked(fetch).mock.calls.length;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30 * 60_000);
  });
  expect(fetch).toHaveBeenCalledTimes(calls);
});

it("on mobile fetches on every menu opening without background polling", async () => {
  desktopMode = false;
  setup();
  await settle();
  expect(fetch).not.toHaveBeenCalled();
  act(() => requestReminderCount());
  await settle();
  expect(fetch).toHaveBeenCalledTimes(1);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30 * 60_000);
  });
  act(() => window.dispatchEvent(new Event("focus")));
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  await settle();
  expect(fetch).toHaveBeenCalledTimes(1);
  vi.mocked(fetch).mockResolvedValueOnce(response(3));
  act(() => requestReminderCount());
  await settle();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(
    screen.getAllByRole("link", { name: /3 в ближайший час/ }),
  ).toHaveLength(2);
  vi.mocked(fetch).mockResolvedValueOnce(response(0));
  act(() => notifyRemindersChanged());
  await settle();
  expect(fetch).toHaveBeenCalledTimes(3);
});

it("starts desktop polling after resizing and stops it on mobile", async () => {
  desktopMode = false;
  setup();
  await settle();
  act(() => {
    desktopMode = true;
    viewportListeners.forEach((listener) => listener());
  });
  await settle();
  expect(fetch).toHaveBeenCalledTimes(1);
  act(() => {
    desktopMode = false;
    viewportListeners.forEach((listener) => listener());
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30 * 60_000);
  });
  expect(fetch).toHaveBeenCalledTimes(1);
});
