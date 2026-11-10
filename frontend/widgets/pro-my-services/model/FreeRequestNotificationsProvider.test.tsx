import { useRef } from "react";
import type { FreeRequestMarker } from "../lib/free-request-notices";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FreeRequestNotificationsProvider,
  useFreeRequestNotifications,
} from "./FreeRequestNotificationsProvider";
import { ProHomeSectionSwitch } from "@/views/pro-home/ui/ProHomeSectionSwitch";
import {
  clearRequestListCache,
  readRequestListCache,
  writeRequestListCache,
} from "../lib/request-list-cache";

const mock = vi.hoisted(() => ({
  user: { id: "provider-one", accountKind: "PROVIDER" },
  handlers: {} as Record<string, (payload: unknown) => void>,
}));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "authenticated", data: { user: mock.user } }),
}));
vi.mock("@/widgets/chat/socket/ChatSocketContext", () => ({
  useChatSocket: () => ({ socket }),
}));
const socket = {
  on: vi.fn((event: string, handler: (value: unknown) => void) => {
    mock.handlers[event] = handler;
  }),
  off: vi.fn((event: string) => {
    delete mock.handlers[event];
  }),
};
const first = { requestId: "first", createdAt: "2026-11-10T10:00:00Z" };
const second = { requestId: "second", createdAt: "2026-11-10T11:00:00Z" };
function LoadedList() {
  const { markSeen, getLatestMarker } = useFreeRequestNotifications();
  const captured = useRef<FreeRequestMarker | null>(null);
  return (
    <>
      <button onClick={() => markSeen()}>Применить загруженные заявки</button>
      <button
        onClick={() => {
          captured.current = getLatestMarker();
        }}
      >
        Начать загрузку
      </button>
      <button onClick={() => markSeen(captured.current)}>
        Завершить загрузку
      </button>
    </>
  );
}
function View() {
  return (
    <FreeRequestNotificationsProvider>
      <ProHomeSectionSwitch
        services={<p>По услугам</p>}
        freeRequests={<LoadedList />}
        reminders={<p>Напоминания</p>}
      />
    </FreeRequestNotificationsProvider>
  );
}
function emit(event: string, payload: unknown) {
  act(() => mock.handlers[event]?.(payload));
}

beforeEach(() => {
  localStorage.clear();
  clearRequestListCache();
  mock.user = { id: "provider-one", accountKind: "PROVIDER" };
  mock.handlers = {};
});
afterEach(cleanup);

describe("free request tab notification", () => {
  it("shows a red dot on a new event, invalidates the free list, and clears only after loading the list", async () => {
    writeRequestListCache({ serviceId: null }, []);
    render(<View />);
    emit("free-request.snapshot", first);
    expect(
      screen.getByRole("tab", { name: "Свободные заявки" }),
    ).toBeInTheDocument();
    writeRequestListCache({ serviceId: null }, []);
    emit("free-request.created", second);
    const tab = screen.getByRole("tab", {
      name: "Свободные заявки: есть новые заявки",
    });
    expect(tab.querySelector(".MuiBadge-dot")).not.toHaveClass(
      "MuiBadge-invisible",
    );
    expect(readRequestListCache({ serviceId: null })).toBeNull();
    fireEvent.click(tab);
    expect(
      screen.getByRole("tab", { name: /есть новые заявки/ }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Применить загруженные заявки" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("tab", { name: "Свободные заявки" }),
      ).toHaveAttribute("aria-selected", "true"),
    );
    expect(
      screen.queryByRole("tab", { name: /есть новые заявки/ }),
    ).not.toBeInTheDocument();
    emit("free-request.created", {
      requestId: "third",
      createdAt: "2026-11-10T12:00:00Z",
    });
    expect(
      screen.getByRole("tab", { name: /есть новые заявки/ }),
    ).toBeInTheDocument();
  });

  it("retains unread state across remounts and detects requests missed during a disconnect", () => {
    const mounted = render(<View />);
    emit("free-request.snapshot", first);
    emit("free-request.created", second);
    mounted.unmount();
    const next = render(<View />);
    expect(
      screen.getByRole("tab", { name: /есть новые заявки/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /есть новые заявки/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Применить загруженные заявки" }),
    );
    next.unmount();
    render(<View />);
    expect(
      screen.queryByRole("tab", { name: /есть новые заявки/ }),
    ).not.toBeInTheDocument();
    emit("free-request.snapshot", {
      requestId: "missed",
      createdAt: "2026-11-10T13:00:00Z",
    });
    expect(
      screen.getByRole("tab", { name: /есть новые заявки/ }),
    ).toBeInTheDocument();
  });

  it("does not reset a live event with an older reconnect snapshot", () => {
    render(<View />);
    emit("free-request.created", second);
    emit("free-request.snapshot", first);
    expect(
      screen.getByRole("tab", { name: /есть новые заявки/ }),
    ).toBeInTheDocument();
  });

  it("does not reload the list for duplicate or out-of-order notifications", () => {
    const refresh = vi.fn();
    window.addEventListener("free-request:created", refresh);
    try {
      render(<View />);
      emit("free-request.created", second);
      emit("free-request.created", second);
      emit("free-request.created", first);
      expect(refresh).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener("free-request:created", refresh);
    }
  });

  it("keeps notification state isolated between accounts and does not subscribe customers", () => {
    const { rerender } = render(<View />);
    emit("free-request.created", second);
    mock.user = { id: "provider-two", accountKind: "PROVIDER" };
    rerender(<View />);
    expect(
      screen.queryByRole("tab", { name: /есть новые заявки/ }),
    ).not.toBeInTheDocument();
    mock.user = { id: "customer", accountKind: "CUSTOMER" };
    rerender(<View />);
    expect(mock.handlers["free-request.created"]).toBeUndefined();
  });

  it("keeps a newer notification unread when an earlier list load completes", () => {
    render(<View />);
    emit("free-request.created", first);
    fireEvent.click(screen.getByRole("tab", { name: /есть новые заявки/ }));
    fireEvent.click(screen.getByRole("button", { name: "Начать загрузку" }));
    emit("free-request.created", second);
    fireEvent.click(screen.getByRole("button", { name: "Завершить загрузку" }));
    expect(
      screen.getByRole("tab", { name: /есть новые заявки/ }),
    ).toBeInTheDocument();
    const stored = JSON.parse(
      localStorage.getItem("free-requests.notice:v2:provider-one")!,
    );
    expect(stored.seen).toEqual(first);
    expect(stored.latest).toEqual(second);
  });

  it("syncs the read marker from another browser tab", () => {
    render(<View />);
    emit("free-request.created", second);
    const key = "free-requests.notice:v2:provider-one";
    localStorage.setItem(
      key,
      JSON.stringify({ initialized: true, latest: second, seen: second }),
    );
    act(() => window.dispatchEvent(new StorageEvent("storage", { key })));
    expect(
      screen.queryByRole("tab", { name: /есть новые заявки/ }),
    ).not.toBeInTheDocument();
  });
});
