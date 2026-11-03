import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatSocketProvider } from "./ChatSocketProvider";
import { useChatSocket } from "./ChatSocketContext";
const mock = vi.hoisted(() => ({ io: vi.fn() }));
vi.mock("socket.io-client", () => ({ io: mock.io }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ status: "authenticated", data: { user: { id: "qa" } } }) }));
vi.mock("@/shared/config/chat-socket", () => ({ getChatSocketUrl: () => "http://socket.test" }));
function Probe() { return <span>{String(useChatSocket().socketConnected)}</span>; }
describe("socket recovery", () => {
  let socket: { connected: boolean; auth: unknown; on: ReturnType<typeof vi.fn>; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; removeAllListeners: ReturnType<typeof vi.fn> };
  let handlers: Record<string, (...args: unknown[]) => void>;
  const token = () => new Response(JSON.stringify({ token: "test-token" }));
  beforeEach(() => {
    vi.useFakeTimers(); vi.clearAllMocks(); handlers = {};
    socket = { connected: false, auth: {}, on: vi.fn((event, handler) => { handlers[event] = handler; }), connect: vi.fn(), disconnect: vi.fn(), removeAllListeners: vi.fn() };
    mock.io.mockReturnValue(socket);
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
  it.each(["network", "503"])("retries an initial %s failure without a reload", async (failure) => {
    const fetcher = vi.fn().mockImplementationOnce(() => failure === "network" ? Promise.reject(new TypeError("offline")) : Promise.resolve(new Response("{}", {status: 503}))).mockImplementation(token);
    vi.stubGlobal("fetch", fetcher);
    render(<ChatSocketProvider><Probe /></ChatSocketProvider>);
    await act(async () => {});
    expect(socket.connect).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(socket.connect).toHaveBeenCalledTimes(1);
    await act(async () => { socket.connected = true; handlers.connect(); });
    expect(screen.getByText("true")).toBeInTheDocument();
  });
  it("recovers online and refreshes credentials without disconnecting a healthy socket", async () => {
    vi.stubGlobal("fetch", vi.fn(token));
    render(<ChatSocketProvider><Probe /></ChatSocketProvider>);
    await act(async () => {});
    socket.connected = true;
    await act(async () => { handlers.connect(); await vi.advanceTimersByTimeAsync(240_000); });
    expect(socket.disconnect).not.toHaveBeenCalled();
    socket.connected = false;
    await act(async () => { window.dispatchEvent(new Event("online")); });
    expect(socket.connect).toHaveBeenCalledTimes(2);
  });
  it("cleans up and does not retry authentication failures in a tight loop", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", {status: 401})));
    const {unmount} = render(<ChatSocketProvider><Probe /></ChatSocketProvider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(fetch).toHaveBeenCalledTimes(1);
    unmount();
    await act(async () => { window.dispatchEvent(new Event("online")); await vi.advanceTimersByTimeAsync(240_000); });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });
  it("refreshes credentials after a server disconnect and closes the socket when authorization is lost", async () => {
    const fetcher = vi.fn(token);
    vi.stubGlobal("fetch", fetcher);
    render(<ChatSocketProvider><Probe /></ChatSocketProvider>);
    await act(async () => {});
    await act(async () => { handlers.disconnect("io server disconnect"); await vi.advanceTimersByTimeAsync(1000); });
    expect(fetcher).toHaveBeenCalledTimes(2);
    socket.connected = true;
    fetcher.mockImplementation(() => new Response("{}", {status: 403}));
    await act(async () => { window.dispatchEvent(new Event("online")); });
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });

});
