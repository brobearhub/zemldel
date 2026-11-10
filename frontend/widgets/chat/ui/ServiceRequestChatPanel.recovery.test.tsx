import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceRequestChatPanel } from "./ServiceRequestChatPanel";
import type { ChatMessageDto } from "@/entities/chat/dto/chat.dto";
const socket = vi.hoisted(() => ({socket: null, socketConnected: false, setOpenConversationId: vi.fn(), joinConversationRoom: vi.fn(async () => ({ok: true, viewerSide: "customer", peerOnline: true})), clearUnreadForConversation: vi.fn()}));
vi.mock("next-auth/react", () => ({useSession: () => ({data: {user: {id: "actor"}}})}));
vi.mock("@/widgets/chat/socket/ChatSocketContext", () => ({useChatSocket: () => socket}));
vi.mock("./Chat", () => ({Chat: (p: {draft: string; onDraftChange: (v: string) => void; rows: {kind: string; message?: ChatMessageDto}[]}) => <><input aria-label="draft" value={p.draft} onChange={e=>p.onDraftChange(e.target.value)} />{p.rows.map(r=>r.message && <span key={r.message.id}>{r.message.body}</span>)}</>}));
const message = (i: number): ChatMessageDto => ({id: `m${i}`, conversationId: "a", senderUserId: "other", senderName: "QA", clientMessageId: `client-${i}`, body: `Message ${i}`, createdAt: new Date(i * 1000).toISOString()});
describe("missed chat messages", () => {
  let available: ChatMessageDto[];
  beforeEach(() => {
    sessionStorage.clear(); vi.clearAllMocks(); socket.socketConnected = false; available = [message(0)];
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    vi.stubGlobal("fetch", vi.fn(async (input) => {
      const u = new URL(String(input), "http://test");
      if (u.pathname.endsWith("/access")) return new Response(JSON.stringify({canRead: true, canWrite: true}));
      if (u.pathname.endsWith("/messages")) {
        const cursor = u.searchParams.get("after");
        const start = cursor ? available.findIndex(m=>m.id===cursor) + 1 : 0;
        return new Response(JSON.stringify(available.slice(start, start + 50)));
      }
      return new Response("{}");
    }));
  });
  afterEach(() => {cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();});
  it("catches up across pages on reconnect and preserves an unsent draft", async () => {
    const {rerender} = render(<ServiceRequestChatPanel serviceRequestId="request" conversationId="a" />);
    await act(async () => {});
    fireEvent.change(screen.getByLabelText("draft"), {target: {value: "Unsent text"}});
    available = Array.from({length: 103}, (_,i)=>message(i));
    socket.socketConnected = true;
    rerender(<ServiceRequestChatPanel serviceRequestId="request" conversationId="a" />);
    await act(async () => { window.dispatchEvent(new Event("request:sync")); });
    expect(screen.getAllByText(/^Message /)).toHaveLength(103);
    expect(screen.getByLabelText("draft")).toHaveValue("Unsent text");
    expect(screen.getAllByText("Message 51")).toHaveLength(1);
  });
  it("retries catch-up online without wiping existing history", async () => {
    render(<ServiceRequestChatPanel serviceRequestId="request" conversationId="a" />);
    await act(async () => {});
    available.push(message(1));
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("offline"));
    await act(async () => { window.dispatchEvent(new Event("request:sync")); });
    expect(screen.getByText("Message 0")).toBeInTheDocument();
    await act(async () => { window.dispatchEvent(new Event("online")); });
    expect(screen.getByText("Message 1")).toBeInTheDocument();
  });
  it("discards a late catch-up after switching conversations", async () => {
    const {rerender} = render(<ServiceRequestChatPanel serviceRequestId="request" conversationId="a" />);
    await act(async () => {});
    const original = vi.mocked(fetch).getMockImplementation()!;
    let finish!: (r: Response) => void;
    vi.mocked(fetch).mockImplementation((input, init) => {
      if (String(input).includes("/a/messages?after=")) return new Promise<Response>(resolve => {finish = resolve;});
      return original(input, init);
    });
    await act(async () => {window.dispatchEvent(new Event("request:sync"));});
    expect(finish).toBeTypeOf("function");
    available = [{...message(200), conversationId: "b"}];
    rerender(<ServiceRequestChatPanel serviceRequestId="request" conversationId="b" />);
    await act(async () => {});
    await act(async () => {finish(new Response(JSON.stringify([message(1)])));});
    expect(screen.getByText("Message 200")).toBeInTheDocument();
    expect(screen.queryByText("Message 1")).not.toBeInTheDocument();
  });

});
